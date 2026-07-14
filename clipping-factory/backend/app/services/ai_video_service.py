import asyncio
import os
import random
import uuid
import subprocess
from pathlib import Path
from app.services.free_video_service import FreeVideoGenerator
from app.core.logging_config import get_logger

logger = get_logger("AIVideoService")

class AIVideoService:
    """
    Replaces RunwareService.
    Uses FreeVideoGenerator (Hugging Face LTX-Video) to generate B-roll, 
    and handles automatic stitching for requested durations > 5 seconds.
    """
    def __init__(self, output_dir: str = "/tmp/ai_videos"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.generator = FreeVideoGenerator(output_dir=self.output_dir)

    async def generate_video(self, prompt: str, duration: int = 5) -> str:
        """
        Generates AI B-roll. If duration > 5, it stitches multiple 5s clips together.
        Returns the path to the generated MP4.
        """
        if duration <= 5:
            # Single shot
            logger.info(f"Generating single {duration}s clip for: {prompt}")
            video_path = await asyncio.to_thread(
                self.generator.generate_video, 
                prompt=prompt, 
                duration=float(duration)
            )
            if not video_path:
                raise Exception("Failed to generate AI B-roll clip")
            return video_path
            
        # Multi-shot stitching for longer durations
        logger.info(f"Generating stitched {duration}s clip for: {prompt}")
        clip_duration = 5
        num_clips = (duration + clip_duration - 1) // clip_duration
        
        scenes = [f"{prompt}, continuous scene {i+1}" for i in range(num_clips)]
        
        async def generate_scene(scene_prompt, index):
            seed = random.randint(1, 99999999)
            video_path = await asyncio.to_thread(
                self.generator.generate_video, 
                prompt=scene_prompt, 
                duration=float(clip_duration), 
                seed=seed
            )
            return index, video_path

        tasks = [generate_scene(scene, i) for i, scene in enumerate(scenes)]
        results = await asyncio.gather(*tasks)
        results.sort(key=lambda x: x[0])
        video_paths = [path for _, path in results]

        if any(v is None for v in video_paths):
            raise Exception("Failed to generate one or more AI clips for stitching.")

        # Stitch
        concat_file_path = os.path.join(self.output_dir, f"concat_list_{uuid.uuid4().hex[:6]}.txt")
        with open(concat_file_path, "w") as f:
            for vp in video_paths:
                f.write(f"file '{os.path.abspath(vp)}'\n")
        
        stitched_path = os.path.join(self.output_dir, f"stitched_{duration}s_{uuid.uuid4().hex[:6]}.mp4")
        concat_cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", 
            "-i", concat_file_path, "-c", "copy", stitched_path
        ]
        subprocess.run(concat_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        logger.info(f"Successfully generated stitched AI B-roll: {stitched_path}")
        return stitched_path
