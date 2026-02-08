"""
Socket.IO event handlers for real-time evacuation coordination
"""

from flask import request
from flask_socketio import emit
import time


def register_socket_events(socketio, app):
    """
    Register all Socket.IO event handlers

    Args:
        socketio: SocketIO instance
        app: Flask app instance (with backboard, gemini, pathfinder, elevenlabs attached)
    """
    backboard = app.backboard
    gemini = app.gemini
    pathfinder = app.pathfinder
    elevenlabs = app.elevenlabs

    @socketio.on('connect')
    def handle_connect():
        """Client connected - send initial connection confirmation"""
        print(f"✅ Client connected: {request.sid}")
        emit('connected', {
            'userId': request.sid,
            'message': 'Connected to EchoAid server',
            'timestamp': time.time()
        })

    @socketio.on('disconnect')
    def handle_disconnect():
        """Client disconnected - remove from Backboard and notify others"""
        user_id = request.sid
        user = backboard.get_user(user_id)
        user_name = user.get('name', 'Unknown') if user else 'Unknown'

        backboard.remove_user(user_id)
        print(f"❌ Client disconnected: {user_id} ({user_name})")

        # Notify other users
        emit('user_left', {
            'userId': user_id,
            'name': user_name,
            'timestamp': time.time()
        }, broadcast=True, include_self=False)

    @socketio.on('join_evacuation')
    def handle_join(data):
        """
        User joins evacuation with their starting position

        Expected data:
            - name: User's name
            - startNode: Starting node ID (e.g., "p129")
        """
        user_id = request.sid
        name = data.get('name', f'User-{user_id[:6]}')
        start_node = data.get('startNode', 'p129')  # Default to hallway h4

        print(f"👤 {name} joining evacuation at {start_node}")

        # Validate node
        if not pathfinder.validate_node(start_node):
            emit('error', {
                'message': f'Invalid starting node: {start_node}',
                'code': 'INVALID_NODE'
            })
            return

        # Store user in Backboard.io memory
        backboard.store_user(user_id, {
            'name': name,
            'currentNode': start_node,
            'route': [],
            'status': 'ACTIVE',
            'progress': 0,
            'joinedAt': time.time()
        })

        # Calculate initial route to best exit
        best_exit = pathfinder.get_best_exit(start_node, backboard.get_all_users())
        blocked_nodes = backboard.get_blocked_nodes()
        route = pathfinder.find_route(start_node, best_exit, blocked_nodes)

        if not route:
            # Try nearest exit if best exit has no path
            best_exit = pathfinder.get_nearest_exit(start_node)
            route = pathfinder.find_route(start_node, best_exit, blocked_nodes)

        if not route:
            emit('error', {
                'message': 'No evacuation route available',
                'code': 'NO_ROUTE'
            })
            return

        backboard.update_user_route(user_id, route)

        # PAUSED: Gemini AI and ElevenLabs features disabled for now
        # Just send the route for visual path generation
        print(f"✅ Route calculated: {len(route)} nodes from {start_node} to {best_exit}")

        # Send route to client (no AI or voice features)
        emit('route_assigned', {
            'userId': user_id,
            'route': route,
            'destination': route[-1] if route else None,
            'reason': 'Visual path generation',
            'timestamp': time.time()
        })

        # Notify other users
        emit('user_joined', {
            'userId': user_id,
            'name': name,
            'position': start_node,
            'timestamp': time.time()
        }, broadcast=True, include_self=False)

        print(f"✅ {name} assigned route to {best_exit}: {len(route)} nodes")

    @socketio.on('position_update')
    def handle_position_update(data):
        """
        Client sends position update

        Expected data:
            - currentNode: Current node ID
            - progress: Current index in route
        """
        user_id = request.sid
        current_node = data.get('currentNode')
        progress = data.get('progress', 0)

        # Update position in Backboard memory
        backboard.update_user_position(user_id, current_node, progress)

        # Broadcast position to all clients for congestion visualization
        user = backboard.get_user(user_id)
        if user:
            emit('user_position', {
                'userId': user_id,
                'name': user.get('name', 'Unknown'),
                'currentNode': current_node,
                'progress': progress,
                'timestamp': time.time()
            }, broadcast=True, include_self=False)

    @socketio.on('report_blockage')
    def handle_blockage_report(data):
        """
        User reports blockage via voice/text - Gemini processes it

        Expected data:
            - message: Natural language blockage description
        """
        user_id = request.sid
        message = data.get('message', '')

        if not message:
            emit('error', {'message': 'Blockage message is required'})
            return

        user = backboard.get_user(user_id)
        reporter_position = user.get('currentNode', 'p129') if user else 'p129'
        reporter_name = user.get('name', 'Unknown') if user else 'Unknown'

        print(f"🚨 Blockage reported by {reporter_name} ({user_id}): {message}")

        # Use Gemini to parse blockage location and severity
        blockage_info = gemini.parse_blockage_report(message, reporter_position)

        if not blockage_info or not blockage_info.get('location'):
            emit('error', {'message': 'Could not understand blockage report'})
            return

        blocked_node = blockage_info['location']
        severity = blockage_info.get('severity', 'HIGH')

        # Validate blocked node
        if not pathfinder.validate_node(blocked_node):
            # Use reporter's position as fallback
            blocked_node = reporter_position

        # Store blockage in memory
        backboard.add_blockage(blocked_node, {
            'reportedBy': user_id,
            'reporterName': reporter_name,
            'severity': severity,
            'type': blockage_info.get('type', 'OTHER'),
            'message': message,
            'timestamp': time.time()
        })

        # Find all users affected by this blockage
        affected_users = backboard.get_users_affected_by_blockage(blocked_node)

        print(f"⚠️  {len(affected_users)} users affected by blockage at {blocked_node}")

        # PAUSED: Voice alerts disabled - just calculate distances for logging
        for affected_user_id in affected_users:
            affected_user = backboard.get_user(affected_user_id)
            if not affected_user:
                continue

            affected_position = affected_user.get('currentNode', 'p129')
            distance = pathfinder.calculate_distance(affected_position, blocked_node)

            print(f"   📏 Distance from {affected_user.get('name')} to blockage: {int(distance)} meters")

            # Send blockage alert to affected user (no voice)
            socketio.emit('blockage_alert', {
                'location': blocked_node,
                'distance': int(distance),
                'severity': severity,
                'type': blockage_info.get('type', 'OTHER'),
                'message': message,
                'timestamp': time.time()
            }, room=affected_user_id)

        # Reroute each affected user
        rerouted_count = 0
        for affected_user_id in affected_users:
            success = reroute_user(affected_user_id, blocked_node, socketio, backboard, gemini, pathfinder, elevenlabs)
            if success:
                rerouted_count += 1

        # Broadcast blockage to all clients (for map visualization)
        emit('blockage_added', {
            'location': blocked_node,
            'severity': severity,
            'type': blockage_info.get('type', 'OTHER'),
            'message': message,
            'reportedBy': reporter_name,
            'affectedUsers': len(affected_users),
            'reroutedUsers': rerouted_count,
            'timestamp': time.time()
        }, broadcast=True)

        print(f"✅ Blockage processed: {rerouted_count}/{len(affected_users)} users rerouted")

    @socketio.on('request_reroute')
    def handle_reroute_request(data):
        """User manually requests reroute"""
        user_id = request.sid
        user = backboard.get_user(user_id)

        if not user:
            emit('error', {'message': 'User not found'})
            return

        current_node = user.get('currentNode', 'p129')
        blocked_nodes = backboard.get_blocked_nodes()

        # Get best exit considering current congestion
        best_exit = pathfinder.get_best_exit(current_node, backboard.get_all_users())
        route = pathfinder.find_route(current_node, best_exit, blocked_nodes)

        if not route:
            emit('error', {'message': 'No route available'})
            return

        backboard.update_user_route(user_id, route)

        emit('route_assigned', {
            'userId': user_id,
            'route': route,
            'destination': best_exit,
            'reason': 'User requested reroute',
            'timestamp': time.time()
        })

        print(f"🔄 Manual reroute for {user.get('name')}: {len(route)} nodes to {best_exit}")

    @socketio.on('clear_blockage')
    def handle_clear_blockage(data):
        """Clear a blockage (admin action)"""
        blocked_node = data.get('location')

        if not blocked_node:
            emit('error', {'message': 'Location required'})
            return

        backboard.remove_blockage(blocked_node)

        emit('blockage_cleared', {
            'location': blocked_node,
            'timestamp': time.time()
        }, broadcast=True)

        print(f"✅ Blockage cleared at {blocked_node}")


def reroute_user(user_id: str, blocked_node: str, socketio, backboard, gemini, pathfinder, elevenlabs) -> bool:
    """
    Recalculate route for a single user avoiding blockage

    Returns:
        True if reroute successful, False otherwise
    """
    user = backboard.get_user(user_id)
    if not user:
        return False

    current_node = user.get('currentNode', 'p129')
    blocked_nodes = backboard.get_blocked_nodes()

    # PAUSED: Gemini AI disabled - use simple best exit logic
    # Just find the best exit without AI suggestions
    target_exit = pathfinder.get_best_exit(current_node, backboard.get_all_users())
    route = pathfinder.find_route(current_node, target_exit, blocked_nodes)

    if route:
        backboard.update_user_route(user_id, route)

        # PAUSED: Voice features disabled
        # Just send the route for visual path generation
        print(f"🔄 Rerouted {user.get('name')} to {target_exit}: {len(route)} nodes")

        socketio.emit('route_assigned', {
            'userId': user_id,
            'route': route,
            'destination': target_exit,
            'reason': f'Rerouted due to blockage at {blocked_node}',
            'timestamp': time.time()
        }, room=user_id)
        return True
    else:
        print(f"❌ Could not find route for {user.get('name')}")
        return False
