"""
Gemini AI service for intelligent evacuation routing and blockage parsing
"""

import google.generativeai as genai
import json
import re


class GeminiService:
    """Gemini AI service for intelligent rerouting and blockage parsing"""

    def __init__(self, api_key: str):
        if not api_key or api_key == "your-gemini-api-key-here":
            print("⚠️  Warning: Gemini API key not set. AI features will use fallback logic.")
            self.enabled = False
            return

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.enabled = True

    def parse_blockage_report(self, message: str, reporter_position: str) -> dict:
        """
        Parse natural language blockage report using Gemini

        Args:
            message: User's blockage report (e.g., "There's fire in the hallway")
            reporter_position: Node ID where user is located

        Returns:
            Dictionary with location, severity, type, and needsImmediate flag
        """
        print(f"🤖 [Gemini AI] Parsing blockage report: '{message}'")

        if not self.enabled:
            print(f"   ⚠️  Gemini not enabled, using fallback logic")
            return self._fallback_parse_blockage(message, reporter_position)

        prompt = f"""
You are an emergency evacuation AI. A user at position "{reporter_position}" reported:
"{message}"

Extract the following information in JSON format:
{{
  "location": "node_id or room_number",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "type": "FIRE" | "DEBRIS" | "CROWD" | "STRUCTURAL" | "OTHER",
  "needsImmediate": true/false
}}

If the user mentions "here" or "this hallway", use their position: {reporter_position}
If unclear, return null for location.

Rules:
- Fire/smoke/explosion = CRITICAL
- Structural damage/collapse = CRITICAL
- Debris/blocked path = HIGH
- Crowded/slow = MEDIUM
- Other = LOW

Return ONLY the JSON object, no additional text.
"""

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # Extract JSON from response (handle markdown code blocks)
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()

            result = json.loads(text)
            print(f"   ✓ Gemini parsed: location={result.get('location')}, severity={result.get('severity')}, type={result.get('type')}")
            return result
        except Exception as e:
            print(f"   ❌ Gemini parse error: {e}")
            print(f"   ⚠️  Falling back to keyword matching")
            return self._fallback_parse_blockage(message, reporter_position)

    def _fallback_parse_blockage(self, message: str, reporter_position: str) -> dict:
        """
        Fallback blockage parser using keyword matching
        """
        message_lower = message.lower()

        # Determine severity based on keywords
        if any(word in message_lower for word in ['fire', 'smoke', 'explosion', 'collapse', 'structural']):
            severity = 'CRITICAL'
            type_detected = 'FIRE' if 'fire' in message_lower or 'smoke' in message_lower else 'STRUCTURAL'
        elif any(word in message_lower for word in ['blocked', 'debris', 'obstacle', 'fallen']):
            severity = 'HIGH'
            type_detected = 'DEBRIS'
        elif any(word in message_lower for word in ['crowd', 'congested', 'slow', 'packed']):
            severity = 'MEDIUM'
            type_detected = 'CROWD'
        else:
            severity = 'HIGH'
            type_detected = 'OTHER'

        # Try to extract room/hallway number
        room_match = re.search(r'(\d{3,4}|h\d+)', message)
        location = f"p{room_match.group(1)}" if room_match else reporter_position

        return {
            "location": location if location.startswith('p') else reporter_position,
            "severity": severity,
            "type": type_detected,
            "needsImmediate": severity in ['CRITICAL', 'HIGH']
        }

    def suggest_reroute(self, current_node: str, blocked_node: str, all_users: dict) -> dict:
        """
        Use Gemini to suggest optimal reroute considering all factors

        Args:
            current_node: User's current node ID
            blocked_node: Blocked node ID
            all_users: Dictionary of all users with their routes

        Returns:
            Dictionary with exit, reason, and priority
        """
        if not self.enabled:
            return self._fallback_suggest_reroute(current_node, blocked_node, all_users)

        # Calculate exit congestion
        exit_loads = {}
        for user_id, user_data in all_users.items():
            route = user_data.get('route', [])
            if route:
                exit_node = route[-1]
                exit_loads[exit_node] = exit_loads.get(exit_node, 0) + 1

        prompt = f"""
You are an evacuation routing AI. A user at node "{current_node}" needs rerouting because "{blocked_node}" is blocked.

Available exits and current loads:
{json.dumps(exit_loads, indent=2)}

Suggest the best exit considering:
1. Shortest path from {current_node}
2. Least congested exit
3. Avoiding {blocked_node}

Return JSON:
{{
  "exit": "p200" | "p201" | "p202" | "p203",
  "reason": "brief explanation",
  "priority": "HIGH" | "NORMAL"
}}

Return ONLY the JSON object, no additional text.
"""

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # Extract JSON from response
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()

            result = json.loads(text)
            return result
        except Exception as e:
            print(f"Gemini reroute error: {e}")
            return self._fallback_suggest_reroute(current_node, blocked_node, all_users)

    def _fallback_suggest_reroute(self, current_node: str, blocked_node: str, all_users: dict) -> dict:
        """
        Fallback reroute suggestion using simple heuristic
        """
        # Calculate exit loads
        exit_loads = {"p200": 0, "p201": 0, "p202": 0, "p203": 0}
        for user_id, user_data in all_users.items():
            route = user_data.get('route', [])
            if route:
                exit_node = route[-1]
                if exit_node in exit_loads:
                    exit_loads[exit_node] += 1

        # Choose least loaded exit
        best_exit = min(exit_loads.items(), key=lambda x: x[1])[0] if exit_loads else 'p200'

        return {
            "exit": best_exit,
            "reason": f"Least congested exit ({exit_loads[best_exit]} users)",
            "priority": "HIGH"
        }


# Test the Gemini service
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv('GEMINI_API_KEY')

    print("🧪 Testing Gemini Service...")
    gemini = GeminiService(api_key=api_key)

    # Test 1: Parse blockage report
    report1 = "There's a fire blocking the hallway!"
    result1 = gemini.parse_blockage_report(report1, "p129")
    print(f"\n✅ Test 1 - Parse fire report:")
    print(f"   Input: '{report1}'")
    print(f"   Output: {json.dumps(result1, indent=2)}")

    # Test 2: Parse blockage with location
    report2 = "Room 1040 has debris blocking the door"
    result2 = gemini.parse_blockage_report(report2, "p129")
    print(f"\n✅ Test 2 - Parse debris report:")
    print(f"   Input: '{report2}'")
    print(f"   Output: {json.dumps(result2, indent=2)}")

    # Test 3: Suggest reroute
    mock_users = {
        "user1": {"route": ["p129", "p134", "p200"]},
        "user2": {"route": ["p107", "p134", "p200"]},
        "user3": {"route": ["p131", "p201"]},
    }
    result3 = gemini.suggest_reroute("p129", "p134", mock_users)
    print(f"\n✅ Test 3 - Suggest reroute:")
    print(f"   Current: p129, Blocked: p134")
    print(f"   Output: {json.dumps(result3, indent=2)}")

    print("\n✨ All tests completed!")
