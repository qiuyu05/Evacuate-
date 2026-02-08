"""
ElevenLabs text-to-speech service for voice navigation
"""

import requests
import base64
from typing import Optional


class ElevenLabsService:
    """ElevenLabs TTS service for voice instructions"""

    def __init__(self, api_key: Optional[str] = None, voice_id: Optional[str] = None):
        self.api_key = api_key
        self.voice_id = voice_id or "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
        self.base_url = "https://api.elevenlabs.io/v1"
        self.enabled = bool(api_key and api_key != "your-elevenlabs-api-key-here")

        if not self.enabled:
            print("⚠️  ElevenLabs API key not set. Voice features will be disabled.")

    def generate_speech(self, text: str) -> Optional[str]:
        """
        Generate speech from text using ElevenLabs API

        Args:
            text: Text to convert to speech

        Returns:
            Base64 encoded audio data (MP3) or None if failed
        """
        if not self.enabled:
            print(f"   ⚠️  ElevenLabs not enabled, skipping TTS for: '{text}'")
            return None

        print(f"🔊 [ElevenLabs] Generating speech: '{text}'")

        try:
            response = requests.post(
                f"{self.base_url}/text-to-speech/{self.voice_id}",
                headers={
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": self.api_key
                },
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                },
                timeout=10
            )
            response.raise_for_status()

            # Convert audio to base64 for easy transmission over Socket.IO
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            print(f"   ✓ Generated {len(response.content)} bytes of audio")
            return audio_base64

        except Exception as e:
            print(f"   ❌ ElevenLabs TTS error: {e}")
            return None

    def generate_navigation_instruction(self, direction: str, distance: Optional[float] = None) -> Optional[str]:
        """
        Generate voice instruction for navigation

        Args:
            direction: Turn direction (e.g., "left", "right", "straight")
            distance: Optional distance in meters

        Returns:
            Base64 encoded audio data
        """
        if distance:
            text = f"In {int(distance)} meters, turn {direction}."
        else:
            text = f"Turn {direction}."

        return self.generate_speech(text)

    def generate_blockage_alert(self, distance: float, severity: str = "HIGH") -> Optional[str]:
        """
        Generate voice alert for blockage

        Args:
            distance: Distance to blockage in meters
            severity: Blockage severity level

        Returns:
            Base64 encoded audio data
        """
        if severity == "CRITICAL":
            text = f"Warning! Critical blockage ahead! {int(distance)} meters in front!"
        elif severity == "HIGH":
            text = f"Blockage in front! {int(distance)} meters ahead!"
        else:
            text = f"Caution. Obstacle {int(distance)} meters ahead."

        return self.generate_speech(text)

    def generate_route_summary(self, destination: str, num_turns: int) -> Optional[str]:
        """
        Generate voice summary of route

        Args:
            destination: Exit name (e.g., "Exit 1")
            num_turns: Number of turns in route

        Returns:
            Base64 encoded audio data
        """
        text = f"Route calculated to {destination}. {num_turns} turns ahead. Follow the instructions."
        return self.generate_speech(text)


# Test the ElevenLabs service
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv('ELEVENLABS_API_KEY')
    voice_id = os.getenv('ELEVENLABS_VOICE_ID')

    print("🧪 Testing ElevenLabs Service...")
    tts = ElevenLabsService(api_key=api_key, voice_id=voice_id)

    # Test 1: Basic speech generation
    audio1 = tts.generate_speech("Testing ElevenLabs text to speech.")
    print(f"\n✅ Test 1 - Basic TTS:")
    print(f"   Generated: {'Yes' if audio1 else 'No'}")

    # Test 2: Navigation instruction
    audio2 = tts.generate_navigation_instruction("left", 15)
    print(f"\n✅ Test 2 - Navigation instruction:")
    print(f"   Text: 'In 15 meters, turn left.'")
    print(f"   Generated: {'Yes' if audio2 else 'No'}")

    # Test 3: Blockage alert
    audio3 = tts.generate_blockage_alert(10, "CRITICAL")
    print(f"\n✅ Test 3 - Blockage alert:")
    print(f"   Text: 'Warning! Critical blockage ahead! 10 meters in front!'")
    print(f"   Generated: {'Yes' if audio3 else 'No'}")

    # Test 4: Route summary
    audio4 = tts.generate_route_summary("Exit 1", 3)
    print(f"\n✅ Test 4 - Route summary:")
    print(f"   Text: 'Route calculated to Exit 1. 3 turns ahead. Follow the instructions.'")
    print(f"   Generated: {'Yes' if audio4 else 'No'}")

    print("\n✨ All tests completed!")
