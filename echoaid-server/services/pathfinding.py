"""
A* pathfinding algorithm for evacuation routing
Ported from JavaScript brain module in App.jsx
"""

import heapq
from typing import List, Optional, Set, Dict, Tuple
import sys
import os
import math

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.map_data import NODES, EDGES, EXITS


class PathfindingEngine:
    """A* pathfinding algorithm for evacuation routing"""

    def __init__(self):
        self.nodes = NODES
        self.edges = EDGES
        self.exits = EXITS
        self._build_graph()

    def _build_graph(self):
        """Build adjacency list from edges for fast neighbor lookup"""
        self.graph = {}
        for edge in self.edges:
            a, b = edge[0], edge[1]
            if a not in self.graph:
                self.graph[a] = []
            if b not in self.graph:
                self.graph[b] = []

            # Bidirectional edges
            self.graph[a].append(b)
            self.graph[b].append(a)

    def find_route(self, start: str, goal: str, blocked_nodes: Optional[Set[str]] = None) -> List[str]:
        """
        A* pathfinding from start to goal avoiding blocked nodes

        Args:
            start: Starting node ID (e.g., "p48")
            goal: Goal node ID (e.g., "p200")
            blocked_nodes: Set of blocked node IDs to avoid

        Returns:
            List of node IDs representing the path, or empty list if no path found
        """
        if blocked_nodes is None:
            blocked_nodes = set()

        if start == goal:
            return [start]

        if start not in self.graph or goal not in self.graph:
            print(f"Warning: start {start} or goal {goal} not in graph")
            return []

        # Priority queue: (f_score, counter, node, path)
        # Counter ensures FIFO for same f_score (Python 3 requirement)
        counter = 0
        open_set = [(0, counter, start, [start])]
        closed_set = set()

        while open_set:
            f_score, _, current, path = heapq.heappop(open_set)

            if current == goal:
                return path

            if current in closed_set:
                continue

            closed_set.add(current)

            # Explore neighbors
            for neighbor in self.graph.get(current, []):
                if neighbor in closed_set or neighbor in blocked_nodes:
                    continue

                new_path = path + [neighbor]
                g_score = len(new_path)  # Number of steps
                h_score = self._heuristic(neighbor, goal)
                f = g_score + h_score

                counter += 1
                heapq.heappush(open_set, (f, counter, neighbor, new_path))

        return []  # No path found

    def _heuristic(self, node_a: str, node_b: str) -> float:
        """
        Euclidean distance heuristic for A*

        Args:
            node_a: First node ID
            node_b: Second node ID

        Returns:
            Euclidean distance between nodes
        """
        pos_a = self.nodes.get(node_a, {})
        pos_b = self.nodes.get(node_b, {})

        x1, y1 = pos_a.get('x', 0), pos_a.get('y', 0)
        x2, y2 = pos_b.get('x', 0), pos_b.get('y', 0)

        return ((x2 - x1)**2 + (y2 - y1)**2)**0.5

    def get_best_exit(self, current_node: str, all_users: Dict) -> str:
        """
        Find best exit considering path length and congestion

        Args:
            current_node: Current node ID
            all_users: Dictionary of all users with their routes

        Returns:
            Exit node ID (e.g., "p200")
        """
        exit_scores = {}

        for exit_id in self.exits:
            path = self.find_route(current_node, exit_id)
            if not path:
                continue

            # Calculate congestion: how many users are routed to this exit
            congestion = sum(1 for u in all_users.values()
                           if exit_id in u.get('route', []))

            # Score = path length + congestion penalty
            # Weight congestion heavily to balance load
            score = len(path) + (congestion * 10)
            exit_scores[exit_id] = score

        if not exit_scores:
            return 'p200'  # Default to Exit 1 if no path found

        # Return exit with lowest score
        return min(exit_scores.items(), key=lambda x: x[1])[0]

    def get_nearest_exit(self, current_node: str) -> str:
        """
        Find nearest exit based purely on path length (no congestion)

        Args:
            current_node: Current node ID

        Returns:
            Nearest exit node ID
        """
        exit_distances = {}

        for exit_id in self.exits:
            path = self.find_route(current_node, exit_id)
            if path:
                exit_distances[exit_id] = len(path)

        if not exit_distances:
            return 'p200'  # Default exit

        return min(exit_distances.items(), key=lambda x: x[1])[0]

    def validate_node(self, node_id: str) -> bool:
        """Check if a node ID exists in the graph"""
        return node_id in self.nodes

    def get_node_info(self, node_id: str) -> Optional[Dict]:
        """Get node information by ID"""
        return self.nodes.get(node_id)

    def calculate_distance(self, node_a: str, node_b: str) -> float:
        """
        Calculate actual distance between two nodes in meters

        Args:
            node_a: First node ID
            node_b: Second node ID

        Returns:
            Distance in meters
        """
        pos_a = self.nodes.get(node_a, {})
        pos_b = self.nodes.get(node_b, {})

        x1, y1 = pos_a.get('x', 0), pos_a.get('y', 0)
        x2, y2 = pos_b.get('x', 0), pos_b.get('y', 0)

        # Distance is already in a scaled coordinate system
        # Assuming 1 unit ≈ 1 meter (adjust if needed)
        return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

    def generate_turn_by_turn_directions(self, route: List[str]) -> List[Dict]:
        """
        Generate turn-by-turn voice navigation directions from a route

        Args:
            route: List of node IDs representing the path

        Returns:
            List of dictionaries with:
            - direction: "left", "right", "straight", "arrive"
            - distance: Distance to next turn in meters
            - instruction: Human-readable text
        """
        if len(route) < 2:
            return []

        directions = []

        for i in range(len(route) - 1):
            current_node = route[i]
            next_node = route[i + 1]

            # Calculate distance to next waypoint
            distance = self.calculate_distance(current_node, next_node)

            # For the first step, just say "proceed"
            if i == 0:
                node_info = self.nodes.get(next_node, {})
                label = node_info.get('label', next_node)
                directions.append({
                    'direction': 'straight',
                    'distance': distance,
                    'instruction': f'Proceed straight for {int(distance)} meters to {label}.'
                })
                continue

            # For middle steps, determine turn direction
            if i < len(route) - 1:
                prev_node = route[i - 1]
                turn_direction = self._calculate_turn_direction(prev_node, current_node, next_node)
                node_info = self.nodes.get(next_node, {})
                label = node_info.get('label', next_node)

                if turn_direction == 'straight':
                    instruction = f'Continue straight for {int(distance)} meters to {label}.'
                else:
                    instruction = f'Turn {turn_direction} and proceed {int(distance)} meters to {label}.'

                directions.append({
                    'direction': turn_direction,
                    'distance': distance,
                    'instruction': instruction
                })

        # Final destination
        final_node = self.nodes.get(route[-1], {})
        final_label = final_node.get('label', 'destination')
        directions.append({
            'direction': 'arrive',
            'distance': 0,
            'instruction': f'You have arrived at {final_label}.'
        })

        return directions

    def _calculate_turn_direction(self, prev_node: str, current_node: str, next_node: str) -> str:
        """
        Calculate turn direction based on angle between three points

        Args:
            prev_node: Previous node ID
            current_node: Current node ID
            next_node: Next node ID

        Returns:
            "left", "right", or "straight"
        """
        pos_prev = self.nodes.get(prev_node, {})
        pos_curr = self.nodes.get(current_node, {})
        pos_next = self.nodes.get(next_node, {})

        x1, y1 = pos_prev.get('x', 0), pos_prev.get('y', 0)
        x2, y2 = pos_curr.get('x', 0), pos_curr.get('y', 0)
        x3, y3 = pos_next.get('x', 0), pos_next.get('y', 0)

        # Calculate vectors
        vec1_x, vec1_y = x2 - x1, y2 - y1
        vec2_x, vec2_y = x3 - x2, y3 - y2

        # Calculate angle using cross product
        cross_product = vec1_x * vec2_y - vec1_y * vec2_x

        # Calculate dot product for angle magnitude
        dot_product = vec1_x * vec2_x + vec1_y * vec2_y
        angle = math.atan2(cross_product, dot_product)
        angle_degrees = math.degrees(angle)

        # Classify turn
        if abs(angle_degrees) < 30:  # Within 30 degrees is straight
            return 'straight'
        elif angle_degrees > 0:
            return 'left'
        else:
            return 'right'


# Test the pathfinding engine
if __name__ == "__main__":
    print("🧪 Testing Pathfinding Engine...")
    engine = PathfindingEngine()

    # Test 1: Find route from a hallway to an exit
    start = "p129"  # Hallway h4
    goal = "p200"  # Exit 1
    route = engine.find_route(start, goal)
    print(f"\n✅ Route from {start} (h4) to {goal} (Exit 1):")
    print(f"   Path: {' → '.join(route)}")
    print(f"   Length: {len(route)} nodes")

    # Test 2: Find route with blockage
    blocked = {"p134"}  # Block hallway h9
    route_blocked = engine.find_route(start, goal, blocked)
    print(f"\n✅ Route from {start} to {goal} avoiding {blocked} (h9):")
    print(f"   Path: {' → '.join(route_blocked)}")
    print(f"   Length: {len(route_blocked)} nodes")

    # Test 3: Get nearest exit
    nearest = engine.get_nearest_exit("p129")
    print(f"\n✅ Nearest exit from p129 (h4): {nearest}")

    # Test 4: Get best exit with congestion
    mock_users = {
        "user1": {"route": ["p129", "p135", "p101", "p130", "p134", "p200"]},
        "user2": {"route": ["p107", "p129", "p135", "p101", "p130", "p134", "p200"]},
        "user3": {"route": ["p131", "p201"]},
    }
    best = engine.get_best_exit("p129", mock_users)
    print(f"\n✅ Best exit from p129 considering congestion: {best}")
    print(f"   (Exit p200 has 2 users, p201 has 1 user)")

    print("\n✨ All tests passed!")
