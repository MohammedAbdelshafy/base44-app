"""
MBM Dashboard API — reads MBM local filesystem data and returns JSON.
"""
import csv
import json
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user

router = APIRouter(prefix="/mbm", tags=["mbm"])

MBM_ROOT = Path(os.environ.get("MBM_ROOT", r"C:\Users\omare\OneDrive\Desktop\AI\MBM"))


def _today_str() -> str:
    return date.today().isoformat()


def _read_csv_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def _read_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _parse_log_date(filename: str) -> tuple[str, str] | None:
    """Parse pipeline log filenames like pipeline_2026-07-07_00-05-17.log"""
    m = re.match(r"pipeline_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.log", filename)
    if m:
        return m.group(1), m.group(2).replace("-", ":")
    return None


def _parse_log_summary(path: Path) -> dict:
    """Extract key metrics from a pipeline log file."""
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()

    result = {
        "file": path.name,
        "date": None,
        "time": None,
        "duration_seconds": None,
        "completed": False,
        "steps_completed": 0,
        "steps_total": 0,
        "qualified_leads": None,
        "output_files": [],
    }

    fn_result = _parse_log_date(path.name)
    if fn_result:
        result["date"], result["time"] = fn_result

    for line in lines:
        if "=== PIPELINE RUN COMPLETED" in line:
            result["completed"] = True
            m = re.search(r"in ([\d.]+)s", line)
            if m:
                result["duration_seconds"] = float(m.group(1))
        elif ">>>" in line and "Starting" in line:
            result["steps_total"] += 1
        elif "<<<" in line and "Finished" in line:
            result["steps_completed"] += 1
        elif "Total Qualified Leads:" in line:
            m = re.search(r"Total Qualified Leads:\s*(\d+)", line)
            if m:
                result["qualified_leads"] = int(m.group(1))
        elif "saved to:" in line or "written to:" in line:
            m = re.search(r"(?:saved to|written to):\s*(.+)", line)
            if m:
                result["output_files"].append(m.group(1).strip())

    return result


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────


@router.get("/summary")
async def get_summary(_: str = Depends(get_current_user)):
    """Aggregate dashboard summary for MBM."""
    today = _today_str()
    lead_pack_dir = MBM_ROOT / "LeadPacks" / f"Pack_{today}"

    # Lead pack manifest
    manifest = _read_json(lead_pack_dir / f"MANIFEST_{today}.json")

    # Pipeline deals
    pipeline = _read_csv_rows(MBM_ROOT / "Pipeline" / "pipeline.csv")

    # Outreach today
    outreach = _read_json(MBM_ROOT / "Logs" / f"outreach_{today}.json")

    # Recent pipeline runs
    log_dir = MBM_ROOT / "Logs"
    run_logs = []
    if log_dir.exists():
        for f in sorted(log_dir.glob("pipeline_*.log"), reverse=True)[:6]:
            run_logs.append(_parse_log_summary(f))

    # Recent artifacts
    artifacts_dir = MBM_ROOT / "Artifacts"
    recent_artifacts = []
    if artifacts_dir.exists():
        all_files = sorted(artifacts_dir.iterdir(), key=os.path.getmtime, reverse=True)
        for f in all_files[:12]:
            if f.is_file() and f.name != ".gitkeep":
                recent_artifacts.append({
                    "name": f.name,
                    "size": f.stat().st_size,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })

    # Lead counts from daily pack log
    daily_log_path = MBM_ROOT / "Logs" / f"daily_pack_{today}.log"
    daily_pack = None
    if daily_log_path.exists():
        daily_pack = daily_log_path.read_text(encoding="utf-8").strip()

    # Active missions
    missions_dir = MBM_ROOT / "Missions"
    active_missions = []
    completed_missions = []
    for sub in ["InProgress", "Inbox", "Review"]:
        p = missions_dir / sub
        if p.exists():
            for f in p.iterdir():
                if f.suffix == ".md":
                    active_missions.append(f.stem)
    p = missions_dir / "Completed"
    if p.exists():
        for f in p.iterdir():
            if f.suffix == ".md":
                completed_missions.append(f.stem)

    return {
        "date": today,
        "leads": {
            "total": manifest.get("total_leads") if manifest else None,
            "wholesalers": manifest.get("wholesalers") if manifest else None,
            "distressed": manifest.get("distressed_sellers") if manifest else None,
            "sources": manifest.get("sources", []) if manifest else [],
            "daily_pack_summary": daily_pack,
            "pipeline_deals": len(pipeline),
            "pipeline_stages": {
                stage: sum(1 for row in pipeline if row.get("stage") == stage)
                for stage in set(row.get("stage", "unknown") for row in pipeline)
            } if pipeline else {},
        },
        "outreach": outreach or {"targets": 0, "sent": 0},
        "runs": {
            "total_logs": len(run_logs),
            "recent": run_logs,
        },
        "outputs": {
            "total_artifacts": len(recent_artifacts),
            "recent": recent_artifacts,
        },
        "missions": {
            "active": active_missions,
            "completed": completed_missions,
        },
    }


@router.get("/leads")
async def get_leads(
    date_str: Optional[str] = Query(None, alias="date"),
    _: str = Depends(get_current_user),
):
    """Return lead pack data for a given date (defaults to today)."""
    dt = date_str or _today_str()
    pack_dir = MBM_ROOT / "LeadPacks" / f"Pack_{dt}"

    manifest = _read_json(pack_dir / f"MANIFEST_{dt}.json")
    full_pack = _read_csv_rows(pack_dir / "FULL_PACK.csv")
    distressed = _read_csv_rows(pack_dir / "DISTRESSED_SELLERS.csv")
    wholesalers = _read_csv_rows(pack_dir / "WHOLESALERS.csv")

    pipeline = _read_csv_rows(MBM_ROOT / "Pipeline" / "pipeline.csv")

    return {
        "date": dt,
        "manifest": manifest,
        "counts": {
            "full_pack": len(full_pack),
            "distressed": len(distressed),
            "wholesalers": len(wholesalers),
        },
        "pipeline": pipeline,
    }


@router.get("/runs")
async def get_runs(
    limit: int = Query(10, ge=1, le=50),
    _: str = Depends(get_current_user),
):
    """Return recent pipeline run logs."""
    log_dir = MBM_ROOT / "Logs"
    if not log_dir.exists():
        return {"runs": []}

    runs = []
    for f in sorted(log_dir.glob("pipeline_*.log"), reverse=True)[:limit]:
        runs.append(_parse_log_summary(f))

    return {"runs": runs}


@router.get("/outputs")
async def get_outputs(
    limit: int = Query(20, ge=1, le=100),
    _: str = Depends(get_current_user),
):
    """Return recent artifact/output files."""
    artifacts_dir = MBM_ROOT / "Artifacts"
    if not artifacts_dir.exists():
        return {"outputs": []}

    outputs = []
    for f in sorted(artifacts_dir.iterdir(), key=os.path.getmtime, reverse=True):
        if f.is_file() and f.name != ".gitkeep":
            outputs.append({
                "name": f.name,
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                "ext": f.suffix.lower(),
            })
        if len(outputs) >= limit:
            break

    return {"outputs": outputs}


@router.get("/clips-today")
async def get_clips_today(_: str = Depends(get_current_user)):
    """Return clip data from the clipping factory for today."""
    import httpx

    cf_base = os.environ.get("CLIPPING_FACTORY_API", "http://localhost:8000")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            summary = await client.get(f"{cf_base}/api/v1/analytics/summary")
            clips_resp = await client.get(
                f"{cf_base}/api/v1/clips?per_page=20",
                auth=(os.environ.get("CF_ADMIN_USER", "admin"),
                      os.environ.get("CF_ADMIN_PASS", "")),
            )
            campaigns_resp = await client.get(
                f"{cf_base}/api/v1/campaigns?per_page=10",
                auth=(os.environ.get("CF_ADMIN_USER", "admin"),
                      os.environ.get("CF_ADMIN_PASS", "")),
            )

            summary_data = summary.json() if summary.status_code == 200 else {}
            clips_data = clips_resp.json() if clips_resp.status_code == 200 else {"items": []}
            campaigns_data = campaigns_resp.json() if campaigns_resp.status_code == 200 else {"items": []}

            return {
                "summary": summary_data,
                "clips": clips_data.get("items", []),
                "campaigns": campaigns_data.get("items", []),
            }
    except Exception as e:
        return {"error": str(e), "summary": {}, "clips": [], "campaigns": []}


@router.post("/ingest-leads")
async def trigger_lead_ingestion(
    source: str = "mbm_leadpacks",
    date_str: Optional[str] = Query(None, alias="date"),
    max_campaigns: int = Query(10, ge=1, le=100),
    _: str = Depends(get_current_user),
):
    """Trigger lead ingestion from MBM lead packs or MBM-Social leads."""
    from app.agents.lead_ingestion import LeadIngestionAgent
    from app.core.database import SyncSessionLocal

    db = SyncSessionLocal()
    try:
        agent = LeadIngestionAgent(db=db)
        result = agent._safe_run(source=source, date_str=date_str, max_campaigns=max_campaigns)
        if result.success:
            db.commit()
            return {"success": True, "data": result.data}
        db.rollback()
        return {"success": False, "error": result.error}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()
