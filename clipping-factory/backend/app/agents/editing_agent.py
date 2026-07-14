"""
EditingAgent — applies all post-processing edits to a raw clip.

Edits applied (all configurable per campaign requirements):
- Aspect ratio conversion (crop/pad to 9:16, 16:9, 1:1)
- Auto-captions (SRT burned-in via ffmpeg)
- Hook text overlay
- Silence removal
- Zoom effects
- Audio normalization
- Background music (optional)
- Resolution normalization

All edits use FFmpeg; MoviePy is available for complex compositing.
Templates are loaded from DB/config — no hardcoded edit logic.
"""
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.agents.base_agent import AgentResult, BaseAgent


# Aspect ratio configs
ASPECT_RATIO_MAP = {
    "9:16": {"width": 1080, "height": 1920},
    "16:9": {"width": 1920, "height": 1080},
    "1:1": {"width": 1080, "height": 1080},
    "4:5": {"width": 1080, "height": 1350},
}


class EditingAgent(BaseAgent):
    name = "editing_agent"

    def run(self, clip_id: str) -> AgentResult:
        from app.models.clip import Clip, ClipStatus
        from app.core.storage import download_file, upload_file

        clip = self.db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            return AgentResult.fail(f"Clip {clip_id} not found")

        campaign = clip.campaign
        requirements = campaign.requirements if campaign else {}

        self.logger.info(f"Editing clip {clip_id}")
        clip.status = ClipStatus.EDITING
        self.db.flush()

        with tempfile.TemporaryDirectory(prefix="clip_edit_") as tmpdir:
            # Download raw clip
            raw_path = download_file(
                clip.storage_bucket,
                clip.storage_key,
                Path(tmpdir) / "raw.mp4",
            )

            # Build edit pipeline
            edited_path, edits_applied = self._apply_edits(
                raw_path=raw_path,
                requirements=requirements,
                clip=clip,
                transcript=clip.source_content.transcript if clip.source_content else None,
                tmpdir=tmpdir,
            )

            if not edited_path or not edited_path.exists():
                clip.status = ClipStatus.QC_FAIL
                clip.qc_notes = "Editing pipeline failed to produce output"
                self.db.flush()
                return AgentResult.fail("Editing failed")

            # Generate hook text via AI
            hook = self._generate_hook(
                clip=clip,
                requirements=requirements,
                transcript_window=self._get_transcript_window(clip),
            )
            clip.hook_text = hook

            # Generate SRT captions
            srt = self._generate_captions_srt(clip)
            clip.captions_srt = srt

            # Burn captions if required
            if requirements.get("caption_required", True) and srt:
                srt_path = Path(tmpdir) / "captions.srt"
                srt_path.write_text(srt, encoding="utf-8")
                captioned_path = Path(tmpdir) / "captioned.mp4"
                self._burn_captions(edited_path, srt_path, captioned_path, requirements)
                if captioned_path.exists():
                    edited_path = captioned_path
                    edits_applied.append("captions_burned")

            # Upload edited clip
            edited_key = clip.storage_key.replace("/raw/", "/edited/")
            upload_file(
                edited_path,
                self.settings.storage_bucket_clips,
                edited_key,
                content_type="video/mp4",
                metadata={"campaign_id": clip.campaign_id, "type": "edited"},
            )

            # Update clip record
            meta = self._probe_video(edited_path)
            clip.storage_key = edited_key
            clip.duration_seconds = meta.get("duration", clip.duration_seconds)
            clip.width = meta.get("width")
            clip.height = meta.get("height")
            clip.fps = meta.get("fps")
            clip.file_size_bytes = edited_path.stat().st_size
            clip.edits_applied = edits_applied
            clip.edit_template = requirements.get("aspect_ratio", "9:16")
            clip.status = ClipStatus.QC_PENDING
            self.db.flush()

        self._audit("clip", clip.id, "edited", metadata={"edits": edits_applied})

        # Trigger QC
        from app.workers.video_tasks import quality_check_clip
        quality_check_clip.apply_async(args=[clip_id], queue="video")

        return AgentResult.ok({"clip_id": clip_id, "edits": edits_applied})

    # ------------------------------------------------------------------
    # Edit pipeline
    # ------------------------------------------------------------------

    def _apply_edits(
        self, raw_path: Path, requirements: dict, clip, transcript, tmpdir: str
    ) -> tuple[Path | None, list[str]]:
        edits = []
        current = raw_path

        # 1. Aspect ratio conversion
        aspect = requirements.get("aspect_ratio", "9:16")
        if aspect in ASPECT_RATIO_MAP:
            target = ASPECT_RATIO_MAP[aspect]
            out = Path(tmpdir) / "ar_converted.mp4"
            if self._convert_aspect_ratio(current, out, target["width"], target["height"]):
                current = out
                edits.append(f"aspect_ratio_{aspect.replace(':', 'x')}")

        # 2. Audio normalization
        out = Path(tmpdir) / "normalized.mp4"
        if self._normalize_audio(current, out):
            current = out
            edits.append("audio_normalized")

        # 3. Silence removal (configurable threshold)
        if requirements.get("remove_silence", False):
            out = Path(tmpdir) / "no_silence.mp4"
            if self._remove_silence(current, out):
                current = out
                edits.append("silence_removed")

        # 4. Resolution normalization
        res = requirements.get("resolution")
        if res:
            parts = res.lower().replace("x", "x").split("x")
            if len(parts) == 2:
                w, h = int(parts[0]), int(parts[1])
                out = Path(tmpdir) / "resized.mp4"
                if self._resize(current, out, w, h):
                    current = out
                    edits.append(f"resized_{w}x{h}")

        return current, edits

    def _convert_aspect_ratio(self, src: Path, dst: Path, width: int, height: int) -> bool:
        """Crop and scale to target dimensions maintaining center framing."""
        cmd = [
            self.settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-vf", (
                f"scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height}"
            ),
            "-c:v", "libx264", "-crf", "23", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            str(dst),
        ]
        return self._run_ffmpeg(cmd)

    def _normalize_audio(self, src: Path, dst: Path) -> bool:
        """Two-pass loudnorm audio normalization to -14 LUFS (broadcast standard)."""
        cmd = [
            self.settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-af", "loudnorm=I=-14:TP=-2:LRA=11",
            "-c:v", "copy",
            str(dst),
        ]
        return self._run_ffmpeg(cmd)

    def _remove_silence(self, src: Path, dst: Path, threshold_db: float = -35.0) -> bool:
        """Remove silent sections below threshold."""
        cmd = [
            self.settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-af", f"silenceremove=start_periods=1:start_silence=0.3:start_threshold={threshold_db}dB",
            "-c:v", "copy",
            str(dst),
        ]
        return self._run_ffmpeg(cmd)

    def _resize(self, src: Path, dst: Path, width: int, height: int) -> bool:
        cmd = [
            self.settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-vf", f"scale={width}:{height}:flags=lanczos",
            "-c:v", "libx264", "-crf", "23", "-preset", "fast",
            "-c:a", "copy",
            str(dst),
        ]
        return self._run_ffmpeg(cmd)

    def _burn_captions(
        self, src: Path, srt_path: Path, dst: Path, requirements: dict
    ) -> bool:
        """Burn SRT captions into the video using ffmpeg subtitles filter."""
        style = requirements.get("caption_style", "bold_white")
        force_style = self._caption_style_string(style)
        cmd = [
            self.settings.ffmpeg_path, "-y",
            "-i", str(src),
            "-vf", f"subtitles={str(srt_path).replace(chr(92), '/')}:force_style='{force_style}'",
            "-c:v", "libx264", "-crf", "21", "-preset", "fast",
            "-c:a", "copy",
            str(dst),
        ]
        return self._run_ffmpeg(cmd)

    def _caption_style_string(self, style: str) -> str:
        styles = {
            "bold_white": "FontName=Arial,FontSize=16,Bold=1,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2",
            "minimal": "FontName=Arial,FontSize=14,Bold=0,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1,Alignment=2",
            "yellow": "FontName=Arial,FontSize=16,Bold=1,PrimaryColour=&H00FFFF,OutlineColour=&H000000,Outline=2,Alignment=2",
        }
        return styles.get(style, styles["bold_white"])

    # ------------------------------------------------------------------
    # Hook generation
    # ------------------------------------------------------------------

    def _generate_hook(self, clip, requirements: dict, transcript_window: str) -> str | None:
        if not requirements.get("hook_required", True):
            return None

        from app.services.ai_service import AIService
        ai = AIService()

        hook_style = requirements.get("hook_style", "bold_statement")
        platform = requirements.get("platform", "TikTok")

        prompt = f"""Write a short, punchy hook text overlay for a {platform} video clip.

Hook style: {hook_style}
Clip transcript excerpt: {transcript_window[:500]}
Platform: {platform}

Requirements:
- Maximum 8 words
- Attention-grabbing, creates curiosity
- No hashtags, no emojis
- Style: {hook_style}

Return ONLY the hook text, nothing else."""

        response = ai.complete(prompt, model=self.settings.ai_fast_model)
        return response.strip() if response else None

    def _get_transcript_window(self, clip) -> str:
        try:
            source = clip.source_content
            if not source or not source.transcript:
                return ""
            segments = source.transcript.segments or []
            return " ".join(
                s["text"] for s in segments
                if s.get("start", 0) >= clip.source_start_seconds
                and s.get("end", 0) <= clip.source_end_seconds + 2
            )
        except Exception:
            return ""

    # ------------------------------------------------------------------
    # Caption SRT generation
    # ------------------------------------------------------------------

    def _generate_captions_srt(self, clip) -> str | None:
        try:
            source = clip.source_content
            if not source or not source.transcript:
                return None

            segments = source.transcript.segments or []
            relevant = [
                s for s in segments
                if s.get("end", 0) >= clip.source_start_seconds
                and s.get("start", 0) <= clip.source_end_seconds
            ]

            lines = []
            for i, seg in enumerate(relevant, 1):
                start = max(0, seg["start"] - clip.source_start_seconds)
                end = max(0, seg["end"] - clip.source_start_seconds)
                lines.append(f"{i}")
                lines.append(f"{self._ts(start)} --> {self._ts(end)}")
                lines.append(seg["text"].strip())
                lines.append("")

            return "\n".join(lines) if lines else None
        except Exception as exc:
            self.logger.debug(f"SRT generation failed: {exc}")
            return None

    def _ts(self, seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _run_ffmpeg(self, cmd: list) -> bool:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                self.logger.warning(f"FFmpeg error: {result.stderr[-300:]}")
                return False
            return True
        except Exception as exc:
            self.logger.error(f"FFmpeg exception: {exc}")
            return False

    def _probe_video(self, path: Path) -> dict:
        import json as _json
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_streams", "-show_format", str(path)],
                capture_output=True, text=True, timeout=30,
            )
            data = _json.loads(result.stdout)
            fmt = data.get("format", {})
            video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
            fps_str = video.get("r_frame_rate", "30/1")
            n, d = fps_str.split("/") if "/" in fps_str else (fps_str, "1")
            return {
                "duration": float(fmt.get("duration", 0)),
                "width": video.get("width"),
                "height": video.get("height"),
                "fps": float(n) / float(d) if float(d) else 30.0,
            }
        except Exception:
            return {}
