"""
ClipGenerationAgent — cuts raw clips from source video using ffmpeg.

Takes clip candidates from ContentAnalysisAgent, cuts precise segments,
generates multiple versions (different hooks/lengths), outputs raw clips
ready for EditingAgent.
"""
import os
import subprocess
import tempfile
from pathlib import Path

from sqlalchemy.orm import Session

from app.agents.base_agent import AgentResult, BaseAgent


class ClipGenerationAgent(BaseAgent):
    name = "clip_generation"

    def run(self, source_content_id: str) -> AgentResult:
        from app.models.source_content import SourceContent
        from app.models.transcript import Transcript
        from app.models.clip import Clip, ClipStatus
        from app.core.storage import download_file, upload_file

        source = (
            self.db.query(SourceContent)
            .filter(SourceContent.id == source_content_id)
            .first()
        )
        if not source:
            return AgentResult.fail(f"SourceContent {source_content_id} not found")

        transcript = source.transcript
        if not transcript or not transcript.clip_candidates:
            return AgentResult.fail("No clip candidates found — run content analysis first")

        campaign = source.campaign
        requirements = campaign.requirements if campaign else {}
        candidates = transcript.clip_candidates

        self.logger.info(
            f"Generating clips for source {source_content_id}: "
            f"{len(candidates)} candidates"
        )

        clips_created = []

        with tempfile.TemporaryDirectory(prefix="clip_gen_") as tmpdir:
            # Download source
            source_path = download_file(
                source.storage_bucket,
                source.storage_key,
                Path(tmpdir) / "source.mp4",
            )

            for idx, candidate in enumerate(candidates):
                try:
                    clip = self._generate_clip(
                        source_path=source_path,
                        candidate=candidate,
                        requirements=requirements,
                        source_content_id=source_content_id,
                        campaign_id=campaign.id,
                        tmpdir=tmpdir,
                        idx=idx,
                    )
                    if clip:
                        clips_created.append(clip.id)
                except Exception as exc:
                    self.logger.error(f"Clip generation failed for candidate {idx}: {exc}")
                    continue

        self.logger.info(f"Generated {len(clips_created)} raw clips")

        # Trigger editing for each clip
        for clip_id in clips_created:
            from app.workers.video_tasks import edit_clip
            edit_clip.apply_async(args=[clip_id], queue="video")

        return AgentResult.ok({"clips_created": clips_created})

    # ------------------------------------------------------------------

    def _generate_clip(
        self,
        source_path: Path,
        candidate: dict,
        requirements: dict,
        source_content_id: str,
        campaign_id: str,
        tmpdir: str,
        idx: int,
    ):
        from app.models.clip import Clip, ClipStatus
        from app.core.storage import upload_file

        start = candidate["start"]
        end = candidate["end"]
        duration = end - start

        output_filename = f"raw_clip_{idx:03d}_{int(start)}_{int(end)}.mp4"
        output_path = Path(tmpdir) / output_filename

        # Cut the clip using ffmpeg (lossless copy for speed — re-encode in editing)
        success = self._ffmpeg_cut(source_path, output_path, start, duration)
        if not success:
            return None

        if not output_path.exists():
            return None

        # Upload raw clip
        storage_key = f"clips/{campaign_id}/raw/{output_filename}"
        upload_file(
            output_path,
            self.settings.storage_bucket_clips,
            storage_key,
            content_type="video/mp4",
            metadata={"campaign_id": campaign_id, "type": "raw"},
        )

        # Create Clip record
        clip = Clip(
            campaign_id=campaign_id,
            source_content_id=source_content_id,
            source_start_seconds=start,
            source_end_seconds=end,
            duration_seconds=duration,
            storage_bucket=self.settings.storage_bucket_clips,
            storage_key=storage_key,
            status=ClipStatus.EDITING,
            overall_score=candidate.get("score", 0.5),
            scores={"content_score": candidate.get("score", 0.5)},
            version=1,
        )
        self.db.add(clip)
        self.db.flush()

        self._audit("clip", clip.id, "generated", metadata={"candidate": candidate})
        return clip

    def _ffmpeg_cut(
        self, source: Path, output: Path, start: float, duration: float
    ) -> bool:
        """Use ffmpeg stream copy for fast initial cut (no re-encode)."""
        cmd = [
            self.settings.ffmpeg_path,
            "-y",
            "-ss", str(start),
            "-i", str(source),
            "-t", str(duration),
            "-c", "copy",           # Stream copy — no quality loss, near-instant
            "-avoid_negative_ts", "1",
            str(output),
        ]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                self.logger.error(f"ffmpeg cut failed: {result.stderr[-500:]}")
                return False
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("ffmpeg cut timed out")
            return False
        except Exception as exc:
            self.logger.error(f"ffmpeg cut exception: {exc}")
            return False
