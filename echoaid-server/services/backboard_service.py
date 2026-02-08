"""
Backboard.io memory service for tracking user positions
Falls back to in-memory storage if Backboard.io is not configured
"""

from typing import Dict, List, Optional
import requests
import time


class BackboardService:
    """Backboard.io memory service for tracking user positions"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://app.backboard.io/api"
        self.memory_id = "echoaid-evacuation"
        self.users = {}  # In-memory cache/fallback
        self.blockages = {}  # In-memory blockage storage
        self.enabled = bool(api_key and api_key != "your-backboard-api-key-here")

        if not self.enabled:
            print("⚠️  Backboard.io not configured. Using in-memory storage.")

    def store_user(self, user_id: str, user_data: dict):
        """
        Store user information in memory

        Args:
            user_id: Unique user/socket ID
            user_data: Dictionary with name, currentNode, route, status, joinedAt
        """
        self.users[user_id] = user_data
        user_name = user_data.get('name', 'Unknown')

        print(f"💾 [Backboard.io] Storing new user: {user_name} (ID: {user_id[:8]})")

        # Also store in Backboard.io if enabled
        if self.enabled:
            self._store_in_backboard(f"user:{user_id}", user_data)
            print(f"   ✓ Persisted to Backboard.io cloud")

    def update_user_position(self, user_id: str, current_node: str, progress: int):
        """
        Update user's current position

        Args:
            user_id: User ID
            current_node: Current node ID (e.g., "p129")
            progress: Progress index in route
        """
        if user_id in self.users:
            user_name = self.users[user_id].get('name', 'Unknown')
            self.users[user_id]['currentNode'] = current_node
            self.users[user_id]['progress'] = progress
            self.users[user_id]['lastUpdate'] = time.time()

            # Log position update
            print(f"📍 [Backboard.io] {user_name} → {current_node} (progress: {progress})")

            if self.enabled:
                self._store_in_backboard(f"user:{user_id}:position", {
                    'node': current_node,
                    'progress': progress,
                    'timestamp': time.time()
                })
                print(f"   ✓ Saved to Backboard.io memory")

    def update_user_route(self, user_id: str, route: List[str]):
        """
        Update user's evacuation route

        Args:
            user_id: User ID
            route: List of node IDs representing the path
        """
        if user_id in self.users:
            self.users[user_id]['route'] = route
            self.users[user_id]['lastRouteUpdate'] = time.time()

            if self.enabled:
                self._store_in_backboard(f"user:{user_id}:route", route)

    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get complete user data"""
        return self.users.get(user_id)

    def get_user_position(self, user_id: str) -> Optional[str]:
        """Get user's current node ID"""
        user = self.users.get(user_id, {})
        return user.get('currentNode')

    def get_all_users(self) -> Dict:
        """Get all active users"""
        return self.users

    def remove_user(self, user_id: str):
        """
        Remove user when they disconnect

        Args:
            user_id: User ID to remove
        """
        if user_id in self.users:
            del self.users[user_id]

            if self.enabled:
                self._delete_from_backboard(f"user:{user_id}")

    def add_blockage(self, node: str, blockage_data: dict):
        """
        Store blockage information

        Args:
            node: Node ID that is blocked
            blockage_data: Dictionary with reportedBy, severity, message, timestamp
        """
        self.blockages[node] = blockage_data

        if self.enabled:
            self._store_in_backboard(f"blockage:{node}", blockage_data)

    def remove_blockage(self, node: str):
        """Remove a blockage"""
        if node in self.blockages:
            del self.blockages[node]

            if self.enabled:
                self._delete_from_backboard(f"blockage:{node}")

    def get_blocked_nodes(self) -> set:
        """Get all currently blocked nodes as a set"""
        return set(self.blockages.keys())

    def get_users_affected_by_blockage(self, blocked_node: str) -> List[str]:
        """
        Find users whose routes pass through the blocked node

        Args:
            blocked_node: Node ID that is blocked

        Returns:
            List of user IDs affected
        """
        affected = []
        for user_id, user_data in self.users.items():
            route = user_data.get('route', [])
            if blocked_node in route:
                affected.append(user_id)
        return affected

    # Backboard.io API methods
    def _store_in_backboard(self, key: str, value):
        """Store data in Backboard.io memory"""
        if not self.enabled:
            return

        try:
            response = requests.post(
                f"{self.base_url}/memory/{self.memory_id}/store",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"key": key, "value": value},
                timeout=5
            )
            response.raise_for_status()
        except Exception as e:
            print(f"Backboard store error: {e}")

    def _query_backboard(self, pattern: str):
        """Query Backboard.io memory"""
        if not self.enabled:
            return []

        try:
            response = requests.get(
                f"{self.base_url}/memory/{self.memory_id}/query",
                headers={"Authorization": f"Bearer {self.api_key}"},
                params={"pattern": pattern},
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Backboard query error: {e}")
            return []

    def _delete_from_backboard(self, key: str):
        """Delete from Backboard.io memory"""
        if not self.enabled:
            return

        try:
            response = requests.delete(
                f"{self.base_url}/memory/{self.memory_id}/delete/{key}",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=5
            )
            response.raise_for_status()
        except Exception as e:
            print(f"Backboard delete error: {e}")

    def get_stats(self) -> Dict:
        """Get memory statistics"""
        return {
            "total_users": len(self.users),
            "total_blockages": len(self.blockages),
            "active_users": sum(1 for u in self.users.values() if u.get('status') == 'ACTIVE'),
            "backboard_enabled": self.enabled
        }


# Test the Backboard service
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv('BACKBOARD_API_KEY')

    print("🧪 Testing Backboard Service...")
    backboard = BackboardService(api_key=api_key)

    # Test 1: Store user
    backboard.store_user("user123", {
        "name": "Test User",
        "currentNode": "p129",
        "route": ["p129", "p131", "p201"],
        "status": "ACTIVE",
        "joinedAt": time.time()
    })
    print(f"\n✅ Test 1 - Store user:")
    print(f"   Stored user123")

    # Test 2: Update position
    backboard.update_user_position("user123", "p131", 1)
    print(f"\n✅ Test 2 - Update position:")
    print(f"   Updated user123 to p131")

    # Test 3: Get user
    user = backboard.get_user("user123")
    print(f"\n✅ Test 3 - Get user:")
    print(f"   User: {user['name']}, Position: {user['currentNode']}")

    # Test 4: Add blockage
    backboard.add_blockage("p134", {
        "reportedBy": "user123",
        "severity": "HIGH",
        "message": "Debris blocking hallway",
        "timestamp": time.time()
    })
    print(f"\n✅ Test 4 - Add blockage:")
    print(f"   Added blockage at p134")

    # Test 5: Check affected users
    backboard.store_user("user456", {
        "name": "User 2",
        "currentNode": "p129",
        "route": ["p129", "p134", "p200"],  # Goes through p134
        "status": "ACTIVE",
        "joinedAt": time.time()
    })
    affected = backboard.get_users_affected_by_blockage("p134")
    print(f"\n✅ Test 5 - Get affected users:")
    print(f"   Users affected by p134 blockage: {affected}")

    # Test 6: Get stats
    stats = backboard.get_stats()
    print(f"\n✅ Test 6 - Get stats:")
    print(f"   Stats: {stats}")

    # Test 7: Remove user
    backboard.remove_user("user123")
    print(f"\n✅ Test 7 - Remove user:")
    print(f"   Removed user123, remaining users: {len(backboard.get_all_users())}")

    print("\n✨ All tests passed!")
