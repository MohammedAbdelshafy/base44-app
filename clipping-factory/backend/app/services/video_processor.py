"""
VideoProcessor — utility class for all FFmpeg operations.
Agents delegate video processing here. Not a Celery task — called synchronously.
"""
import json
import subprocess
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.logging_config import get_logger

settings = get_settings()
logger = get_logger("services.video")


class VideoProcessor:

    @staticmethod
    def probe(path: str | Path) -> dict:
        """Full ffprobe output as a dict."""
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_streams", "-show_format",
                str(path),
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {result.stderr}")
        return json.loads(result.stdout)

    @staticmethod
    def get_duration(path: str | Path) -> float:
        data = VideoProcessor.probe(path)
        return float(data.get("format", {}).get("duration", 0))

    @staticmethod
    def get_dimensions(path: str | Path) -> tuple[int, int]:
        data = VideoProcessor.probe(path)
        video = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "video"), {}
        )
        return video.get("width", 0), video.get("height", 0)

    @staticmethod
    def extract_audio(video_path: str | Path, audio_path: str | Path) -> bool:
        """Extract audio track to WAV for transcription."""
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-vn",
            "-ar", "16000",          # 16kHz mono — optimal for Whisper
            "-ac", "1",
            "-f", "wav",
            str(audio_path),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def create_thumbnail(video_path: str | Path, image_path: str | Path, timestamp: float = 0.0) -> bool:
        """Extract a single frame as a JPEG thumbnail."""
        cmd = [
            settings.ffmpeg_path, "-y",
            "-ss", str(timestamp),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            str(image_path),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def concat_clips(clip_paths: list[Path], output_path: Path, tmpdir: str) -> bool:
        """Concatenate multiple clips in sequence."""
        list_file = Path(tmpdir) / "concat_list.txt"
        with open(list_file, "w") as f:
            for p in clip_paths:
                f.write(f"file '{str(p)}'\n")
        cmd = [
            settings.ffmpeg_path, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            str(output_path),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def add_fade(
        src: Path, dst: Path,
        fade_in: float = 0.3,
        fade_out: float = 0.3,
        duration: Optional[float] = None,
    ) -> bool:
        """Add fade in/out effects."""
        if duration is None:
            duration = VideoProcessor.get_duration(src)
        fade_out_start = max(0, duration - fade_out)
        vf = f"fade=t=in:st=0:d={fade_in},fade=t=out:st={fade_out_start}:d={fade_out}"
        af = f"afade=t=in:st=0:d={fade_in},afade=t=out:st={fade_out_start}:d={fade_out}"
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-vf", vf,
            "-af", af,
            "-c:v", "libx264", "-crf", "23",
            "-c:a", "aac",
            str(dst),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def add_watermark(
        src: Path, dst: Path,
        watermark_path: Path,
        position: str = "bottom_right",
    ) -> bool:
        positions = {
            "bottom_right": "W-w-10:H-h-10",
            "bottom_left": "10:H-h-10",
            "top_right": "W-w-10:10",
            "top_left": "10:10",
        }
        overlay = positions.get(position, positions["bottom_right"])
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-i", str(watermark_path),
            "-filter_complex", f"overlay={overlay}",
            "-c:a", "copy",
            str(dst),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def compress(src: Path, dst: Path, target_bitrate_kbps: int = 2000) -> bool:
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-c:v", "libx264",
            "-b:v", f"{target_bitrate_kbps}k",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(dst),
        ]
        return VideoProcessor._run(cmd)

    @staticmethod
    def _run(cmd: list, timeout: int = 600) -> bool:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            if result.returncode != 0:
                logger.warning(f"FFmpeg error: {result.stderr[-400:]}")
                return False
            return True
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg timed out")
            return False
        except Exception as exc:
            logger.error(f"FFmpeg exception: {exc}")
            return False
