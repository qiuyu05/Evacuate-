"""
EchoAid - Real-Time AI-Powered Evacuation Server
Flask + Socket.IO + Gemini AI + Backboard.io
"""

from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
import os

from services.backboard_service import BackboardService
from services.gemini_service import GeminiService
from services.pathfinding import PathfindingEngine
from services.elevenlabs_service import ElevenLabsService
from events.socket_events import register_socket_events

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'echoaid-secret-key')

# Enable CORS for all routes (allows React frontend to connect)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Socket.IO with CORS support
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25
)

# Initialize services
print("🔧 Initializing services...")

backboard = BackboardService(api_key=os.getenv('BACKBOARD_API_KEY'))
gemini = GeminiService(api_key=os.getenv('GEMINI_API_KEY'))
pathfinder = PathfindingEngine()
elevenlabs = ElevenLabsService(
    api_key=os.getenv('ELEVENLABS_API_KEY'),
    voice_id=os.getenv('ELEVENLABS_VOICE_ID')
)

# Attach services to app context for access in event handlers
app.backboard = backboard
app.gemini = gemini
app.pathfinder = pathfinder
app.elevenlabs = elevenlabs

print("✅ Services initialized")

# Register Socket.IO event handlers
register_socket_events(socketio, app)
print("✅ Socket.IO events registered")


# REST API endpoints

@app.route('/')
def index():
    """Server status endpoint"""
    return jsonify({
        "status": "EchoAid Server Running",
        "version": "1.0.0",
        "services": {
            "backboard": backboard.enabled,
            "gemini": gemini.enabled,
            "pathfinder": True
        }
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    stats = backboard.get_stats()
    return jsonify({
        "status": "healthy",
        "users_connected": stats['total_users'],
        "active_users": stats['active_users'],
        "blockages": stats['total_blockages'],
        "timestamp": import_time()
    })


@app.route('/stats')
def stats():
    """Detailed statistics endpoint"""
    stats = backboard.get_stats()
    all_users = backboard.get_all_users()

    # Calculate exit distribution
    exit_distribution = {"p200": 0, "p201": 0, "p202": 0, "p203": 0}
    for user in all_users.values():
        route = user.get('route', [])
        if route:
            exit_node = route[-1]
            if exit_node in exit_distribution:
                exit_distribution[exit_node] += 1

    return jsonify({
        **stats,
        "exit_distribution": exit_distribution,
        "users": [
            {
                "id": uid[:8],
                "name": u.get('name'),
                "position": u.get('currentNode'),
                "status": u.get('status'),
                "progress": f"{u.get('progress', 0)}/{len(u.get('route', []))}"
            }
            for uid, u in all_users.items()
        ]
    })


@app.route('/api/test-route', methods=['POST'])
def test_route():
    """Test pathfinding endpoint"""
    data = request.json
    start = data.get('start', 'p129')
    goal = data.get('goal', 'p200')
    blocked = set(data.get('blocked', []))

    route = pathfinder.find_route(start, goal, blocked)

    return jsonify({
        "start": start,
        "goal": goal,
        "blocked": list(blocked),
        "route": route,
        "length": len(route),
        "found": len(route) > 0
    })


def import_time():
    """Helper to get current timestamp"""
    import time
    return time.time()


# Error handlers

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


# Main entry point

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')

    print("\n" + "="*60)
    print("🚀 EchoAid Server Starting")
    print("="*60)
    print(f"📡 Server URL: http://{host}:{port}")
    print(f"🌐 Frontend: Connect to http://localhost:{port} or ngrok URL")
    print(f"")
    print(f"Services:")
    print(f"  • Backboard.io: {'✅ Enabled' if backboard.enabled else '⚠️  Disabled (using in-memory)'}")
    print(f"  • Gemini AI: {'✅ Enabled' if gemini.enabled else '⚠️  Disabled (using fallback)'}")
    print(f"  • Pathfinding: ✅ Enabled")
    print(f"")
    print(f"💡 Tip: Run 'ngrok http {port}' in another terminal to expose server")
    print(f"💡 Then connect phones to the ngrok HTTPS URL")
    print("="*60 + "\n")

    # Run the server
    socketio.run(
        app,
        host=host,
        port=port,
        debug=True,
        allow_unsafe_werkzeug=True  # For development only
    )
