import os
import shutil
import uuid
from typing import Optional
from gradio_client import Client

class FreeVideoGenerator:
    def __init__(self, output_dir: str = "outputs"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Load tokens from environment (comma-separated list of tokens)
        hf_tokens_env = os.environ.get("HF_TOKENS", "")
        self.tokens = [t.strip() for t in hf_tokens_env.split(",")] if hf_tokens_env else []
        self.current_token_idx = 0
        
        # Primary spaces (clones of LTX-Video distilled can be added here)
        self.spaces = [
            "Lightricks/ltx-video-distilled",
            # We can add Wan 2.1 or other fallbacks if they have the same API,
            # but for now, rotating tokens on the primary space is best.
        ]
        
    def generate_video(self, prompt: str, negative_prompt: str = "", duration: float = 2.0, seed: int = 42) -> Optional[str]:
        """
        Generates a video via the free Hugging Face Space for LTX-Video.
        Returns the path to the downloaded MP4 file, or None if failed.
        """
        print(f"[*] Requesting LTX Video for prompt: '{prompt}' with duration: {duration}s")
        
        # Determine token to use
        token = None
        if self.tokens:
            token = self.tokens[self.current_token_idx]
            self.current_token_idx = (self.current_token_idx + 1) % len(self.tokens)
            print(f"[*] Authenticating with HF Token {self.current_token_idx + 1}/{len(self.tokens)}")
        else:
            print("[!] Warning: No HF_TOKENS provided. Using unauthenticated (low quota) requests.")

        for space_id in self.spaces:
            print(f"[*] Trying Hugging Face Space: {space_id}")
            try:
                client = Client(space_id, hf_token=token)
                result = client.predict(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    input_image_filepath=None,
                    input_video_filepath=None,
                    height_ui=512,
                    width_ui=704,
                    mode="text-to-video",
                    duration_ui=duration,
                    ui_frames_to_use=9,
                    seed_ui=seed,
                    randomize_seed=True,
                    ui_guidance_scale=1,
                    improve_texture_flag=True,
                    api_name="/text_to_video"
                )
                
                print(f"[*] Gradio response from {space_id}: {result}")
                video_data = result[0]
                
                video_path = None
                if isinstance(video_data, dict) and 'video' in video_data:
                    video_path = video_data['video']
                elif isinstance(video_data, str):
                    video_path = video_data
                
                if not video_path or not os.path.exists(video_path):
                    print(f"[-] Failed to locate generated video in response from {space_id}.")
                    continue # Try next space
                    
                final_filename = f"ltx_free_{uuid.uuid4().hex[:8]}.mp4"
                final_path = os.path.join(self.output_dir, final_filename)
                shutil.copy(video_path, final_path)
                print(f"[+] Successfully saved video to: {final_path}")
                return final_path
                
            except Exception as e:
                print(f"[-] Error generating video via Space {space_id}: {e}")
                if "ZeroGPU quota" in str(e):
                    print("[-] Hit ZeroGPU quota limit for this token/IP.")
                continue # Try next space
        
        print("[-] All available Hugging Face Spaces failed or hit limits.")
        return None

# Simple test block
if __name__ == "__main__":
    generator = FreeVideoGenerator()
    res = generator.generate_video(prompt="A futuristic neon city at night, flying cars zooming by, cinematic, 4k, hyper-detailed")
    print("Test Output:", res)
