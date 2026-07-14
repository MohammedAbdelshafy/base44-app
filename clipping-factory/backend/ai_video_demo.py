import asyncio
import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__)))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.ai_video_service import AIVideoService

async def test_ai_video_capabilities():
    print("==================================================")
    print("  CLIPPING FACTORY - AI VIDEO GENERATION DEMO     ")
    print("==================================================")
    
    try:
        service = AIVideoService()
        print("[+] AIVideoService initialized successfully.")
        
        prompt = "A high-definition drone shot of a green mountain valley with a winding river, photorealistic"
        duration = 10  # Test the 10-second stitching logic
        
        print(f"\n[*] Requesting AI B-roll:")
        print(f"    Prompt: '{prompt}'")
        print(f"    Duration: {duration} seconds")
        print(f"    Waiting for generation (may take a few minutes)...")
        
        video_path = await service.generate_video(prompt=prompt, duration=duration)
        print(f"\n[+] Success! Video generated at: {video_path}")
        
    except Exception as e:
        print(f"[-] Demo verification failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_video_capabilities())
