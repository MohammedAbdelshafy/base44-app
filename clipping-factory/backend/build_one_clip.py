"""
Synchronous end-to-end driver: builds ONE real clip from a demo campaign.
Runs every pipeline stage in-process so each step is visible and debuggable.
Final clip is downloaded from MinIO to the Desktop.

Usage:  python build_one_clip.py
"""
import os
import sys
import traceback
from pathlib import Path

# Force the local Postgres (overrides any DATABASE_URL in .env, e.g. Neon).
# pydantic-settings reads os.environ with higher priority than the .env file,
# so popping is not enough — we must set the local URL explicitly.
os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://clipuser:clippass@localhost:5432/clipping_factory"
)
BACKEND = Path(__file__).parent
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)


def log(stage, msg):
    print(f"\n{'='*60}\n[{stage}] {msg}\n{'='*60}", flush=True)


def main():
    from app.core.database import SyncSessionLocal
    from app.models.campaign import Campaign, CampaignStatus
    from app.models.clip import Clip
    from app.agents.content_acquisition import ContentAcquisitionAgent
    from app.agents.content_analysis import ContentAnalysisAgent
    from app.agents.clip_generation import ClipGenerationAgent
    from app.agents.editing_agent import EditingAgent
    from app.agents.quality_control import QualityControlAgent

    db = SyncSessionLocal()

    # ---- Pick a demo campaign with a source URL -------------------------
    campaign = (
        db.query(Campaign)
        .filter(Campaign.source_url.isnot(None))
        .order_by(Campaign.created_at.desc())
        .first()
    )
    if not campaign:
        print("No campaign with a source URL found. Run 'seed demo' first.")
        return 1

    # Give it concrete clip requirements so editing produces a polished 9:16 clip
    campaign.requirements = {
        "duration_min": 20,
        "duration_max": 40,
        "aspect_ratio": "9:16",
        "resolution": "1080x1920",
        "platform": "TikTok",
        "caption_required": True,
        "hook_required": True,
    }
    db.commit()
    log("TARGET", f"Campaign: {campaign.title}\n  id={campaign.id}\n  source={campaign.source_url}")

    # ---- Stage 1: Acquire (download from YouTube -> MinIO) --------------
    log("1/5 ACQUIRE", "Downloading source video and uploading to MinIO...")
    r1 = ContentAcquisitionAgent(db).run(campaign_id=campaign.id)
    db.commit()
    if not r1.success:
        print(f"ACQUIRE FAILED: {r1.error}")
        return 1
    src_id = r1.data["source_content_id"]
    print(f"  -> source_content_id={src_id}")

    # ---- Stage 2: Analyze (Whisper transcribe + AI viral moments) ------
    log("2/5 ANALYZE", "Transcribing (Whisper) and detecting viral moments (Gemini)...")
    r2 = ContentAnalysisAgent(db).run(source_content_id=src_id)
    db.commit()
    if not r2.success:
        print(f"ANALYZE FAILED: {r2.error}")
        return 1
    print(f"  -> {r2.data}")

    # Safety net: guarantee at least one candidate so a clip is always built
    from app.models.transcript import Transcript
    from app.models.source_content import SourceContent
    src = db.query(SourceContent).filter(SourceContent.id == src_id).first()
    transcript = src.transcript
    if not transcript.clip_candidates:
        dur = src.duration_seconds or 60
        start = min(10.0, max(0.0, dur * 0.2))
        end = min(start + 30, dur)
        transcript.clip_candidates = [{
            "start": round(start, 3), "end": round(end, 3),
            "duration": round(end - start, 3), "score": 0.7,
            "type": "fallback", "reason": "auto-selected window",
            "transcript_window": (transcript.full_text or "")[:500],
            "tags": ["fallback"],
        }]
        db.commit()
        print(f"  -> AI returned no candidates; injected fallback window {start:.0f}-{end:.0f}s")

    # ---- Stage 3: Generate raw clips (ffmpeg cut) ----------------------
    log("3/5 GENERATE", "Cutting raw clip segment(s) with ffmpeg...")
    r3 = ClipGenerationAgent(db).run(source_content_id=src_id)
    db.commit()
    if not r3.success or not r3.data.get("clips_created"):
        print(f"GENERATE FAILED: {r3.error or 'no clips created'}")
        return 1
    clip_id = r3.data["clips_created"][0]
    print(f"  -> built {len(r3.data['clips_created'])} raw clip(s); editing first: {clip_id}")

    # ---- Stage 4: Edit (aspect ratio, audio, captions, hook) -----------
    log("4/5 EDIT", "Applying 9:16 crop, audio normalize, burn captions, AI hook...")
    r4 = EditingAgent(db).run(clip_id=clip_id)
    db.commit()
    if not r4.success:
        print(f"EDIT FAILED: {r4.error}")
        return 1
    print(f"  -> edits applied: {r4.data.get('edits')}")

    # ---- Stage 5: Quality control --------------------------------------
    log("5/5 QC", "Running quality control checks...")
    r5 = QualityControlAgent(db).run(clip_id=clip_id)
    db.commit()
    print(f"  -> QC: success={r5.success} data={r5.data} error={r5.error}")

    # ---- Download the finished clip to the Desktop ---------------------
    log("DELIVER", "Downloading finished clip from MinIO...")
    from app.core.storage import download_file
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    out_path = Path(os.environ["USERPROFILE"]) / "Desktop" / "demo_clip.mp4"
    download_file(clip.storage_bucket, clip.storage_key, out_path)

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\n{'#'*60}")
    print(f"#  CLIP BUILT SUCCESSFULLY")
    print(f"#  File:       {out_path}")
    print(f"#  Size:       {size_mb:.2f} MB")
    print(f"#  Duration:   {clip.duration_seconds}s")
    print(f"#  Resolution: {clip.width}x{clip.height}")
    print(f"#  Hook:       {clip.hook_text}")
    print(f"#  Status:     {clip.status}")
    print(f"#  Score:      {clip.overall_score}")
    print(f"{'#'*60}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        sys.exit(1)
