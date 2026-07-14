import asyncio
from gradio_client import Client, handle_file
import time

def generate_free_video():
    try:
        print("Connecting to Hugging Face Space 'Lightricks/LTX-Video'...")
        client = Client("Lightricks/LTX-Video")
        print("Connected. Sending predict request (this could take a few minutes if there's a queue)...")
        # According to the Lightricks/LTX-Video Gradio UI:
        # Inputs: image (optional), prompt, negative_prompt, seed, resolution, frames
        # We will check the api endpoints using client.view_api()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    generate_free_video()
