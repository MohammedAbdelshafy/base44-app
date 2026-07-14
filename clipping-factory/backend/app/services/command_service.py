"""
CommandService — processes natural-language commands from the Command Center UI.

Maps user intent to system actions. Uses Claude to parse free-text commands.
All actions are logged to the audit log.
"""
from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.services.ai_service import AIService

logger = get_logger("services.command")

KNOWN_COMMANDS = {
    "start_processing": "Start processing all pending campaigns",
    "pause_all": "Pause all campaign processing",
    "resume_all": "Resume all paused campaigns",
    "show_health": "Show system health status",
    "show_failures": "Show recent failures",
    "show_revenue": "Show revenue summary",
    "show_activity": "Show today's activity",
    "generate_report": "Generate a summary report",
    "reprocess_campaign": "Reprocess a specific campaign",
    "add_page": "Add a new page/account",
    "remove_page": "Remove a page/account",
    "pause_page": "Pause a specific page",
    "resume_page": "Resume a specific page",
    "add_source": "Add a campaign source URL",
    "approve_clip": "Approve a clip for submission",
    "reject_clip": "Reject a clip",
    "seed_demo": "Seed demo campaigns for testing without Clipping.com credentials",
    "show_ai_status": "Show which AI provider is active and free tier status",
}


class CommandService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = AIService()

    def execute(self, command_text: str, actor: str = "admin") -> dict[str, Any]:
        """Parse a natural-language command and execute it."""
        logger.info(f"Command received from {actor}: {command_text}")

        intent = self._parse_intent(command_text)
        if not intent:
            return {"success": False, "message": "Could not understand command. Try: 'show health', 'pause all', 'start processing'"}

        action = intent.get("action")
        params = intent.get("params", {})

        handlers = {
            "start_processing": self._start_processing,
            "pause_all": self._pause_all,
            "resume_all": self._resume_all,
            "show_health": self._show_health,
            "show_failures": self._show_failures,
            "show_revenue": self._show_revenue,
            "show_activity": self._show_activity,
            "generate_report": self._generate_report,
            "reprocess_campaign": self._reprocess_campaign,
            "pause_page": self._pause_page,
            "resume_page": self._resume_page,
            "approve_clip": self._approve_clip,
            "reject_clip": self._reject_clip,
            "seed_demo": self._seed_demo,
            "show_ai_status": self._show_ai_status,
        }

        handler = handlers.get(action)
        if not handler:
            return {"success": False, "message": f"Unknown action: {action}. Known: {list(handlers.keys())}"}

        result = handler(params, actor)

        # Audit log
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            entity_type="command",
            entity_id="system",
            action=action,
            actor=actor,
            new_value=command_text,
            metadata_json={"intent": intent, "result": result},
        )
        self.db.add(audit)
        self.db.flush()

        return result

    def _parse_intent(self, text: str) -> dict | None:
        """Use Claude to parse natural language into structured intent."""
        commands_list = "\n".join(f"- {k}: {v}" for k, v in KNOWN_COMMANDS.items())
        prompt = f"""Parse this command into a JSON intent object.

Available actions:
{commands_list}

User command: "{text}"

Return JSON:
{{"action": "action_name", "params": {{"key": "value"}}}}

If the command is ambiguous, choose the closest match.
If no match, return {{"action": null}}.
Return only JSON."""

        response = self.ai.complete(prompt, model=self.ai._get_anthropic().__class__.__name__ and
                                   __import__("app.core.config", fromlist=["get_settings"]).get_settings().ai_fast_model)
        if not response:
            return self._rule_based_parse(text)

        try:
            import json
            text_clean = response.strip().strip("```json").strip("```").strip()
            return json.loads(text_clean)
        except Exception:
            return self._rule_based_parse(text)

    def _rule_based_parse(self, text: str) -> dict | None:
        """Fallback rule-based parsing."""
        t = text.lower().strip()
        patterns = [
            # Specific patterns first — order matters
            (r"\b(ai\s+status|provider|which\s+ai)\b", "show_ai_status"),
            (r"\b(seed|demo)\b", "seed_demo"),
            (r"\b(start|begin|run|process)\b", "start_processing"),
            (r"\bpause\s+all\b", "pause_all"),
            (r"\b(resume|unpause)\s+all\b", "resume_all"),
            (r"\b(health|status)\b", "show_health"),
            (r"\bfail(ure|ed)s?\b", "show_failures"),
            (r"\brevenue\b", "show_revenue"),
            (r"\b(today|activity)\b", "show_activity"),
            (r"\b(report|summary)\b", "generate_report"),
        ]
        for pattern, action in patterns:
            if re.search(pattern, t):
                return {"action": action, "params": {}}
        return None

    # ------------------------------------------------------------------
    # Action handlers
    # ------------------------------------------------------------------

    def _start_processing(self, params: dict, actor: str) -> dict:
        from app.models.campaign import Campaign, CampaignStatus
        campaigns = self.db.query(Campaign).filter(
            Campaign.status == CampaignStatus.READY,
            Campaign.is_active == True,
        ).all()

        for c in campaigns:
            from app.workers.video_tasks import acquire_content
            acquire_content.apply_async(args=[c.id], queue="acquisition")

        return {"success": True, "message": f"Started processing {len(campaigns)} campaigns"}

    def _pause_all(self, params: dict, actor: str) -> dict:
        from app.models.campaign import Campaign, CampaignStatus
        updated = self.db.query(Campaign).filter(
            Campaign.status.in_([CampaignStatus.READY, CampaignStatus.PROCESSING])
        ).update({"status": CampaignStatus.PAUSED})
        return {"success": True, "message": f"Paused {updated} campaigns"}

    def _resume_all(self, params: dict, actor: str) -> dict:
        from app.models.campaign import Campaign, CampaignStatus
        updated = self.db.query(Campaign).filter(
            Campaign.status == CampaignStatus.PAUSED
        ).update({"status": CampaignStatus.READY})
        return {"success": True, "message": f"Resumed {updated} campaigns"}

    def _show_health(self, params: dict, actor: str) -> dict:
        from app.models.analytics import HealthCheck
        latest = (
            self.db.query(HealthCheck)
            .order_by(HealthCheck.created_at.desc())
            .first()
        )
        if not latest:
            return {"success": True, "message": "No health data yet. Health monitor may not be running."}
        return {
            "success": True,
            "message": f"System status: {latest.status.upper()}",
            "data": {
                "status": latest.status,
                "services": latest.services,
                "alerts": latest.alerts,
                "ts": latest.created_at.isoformat(),
            },
        }

    def _show_failures(self, params: dict, actor: str) -> dict:
        from app.models.job import Job, JobStatus
        from datetime import timedelta, datetime, timezone
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        failures = (
            self.db.query(Job)
            .filter(Job.status == JobStatus.FAILED, Job.created_at >= cutoff)
            .order_by(Job.created_at.desc())
            .limit(20)
            .all()
        )
        return {
            "success": True,
            "message": f"{len(failures)} failures in last 24h",
            "data": [{"id": j.id, "task": j.task_name, "error": j.error_message} for j in failures],
        }

    def _show_revenue(self, params: dict, actor: str) -> dict:
        from app.services.analytics_service import AnalyticsService
        summary = AnalyticsService(self.db).get_dashboard_summary()
        rev = summary["revenue"]["total_usd"]
        accepted = summary["clips"]["accepted"]
        rate = summary["clips"]["acceptance_rate"]
        return {
            "success": True,
            "message": f"Total revenue: ${rev:.2f} | {accepted} clips accepted | {rate:.1f}% acceptance rate",
            "data": summary,
        }

    def _show_activity(self, params: dict, actor: str) -> dict:
        from app.services.analytics_service import AnalyticsService
        return {
            "success": True,
            "data": AnalyticsService(self.db).get_dashboard_summary(),
        }

    def _generate_report(self, params: dict, actor: str) -> dict:
        from app.services.analytics_service import AnalyticsService
        summary = AnalyticsService(self.db).get_dashboard_summary()
        report = self.ai.complete(
            f"Generate a brief business performance report from this data: {summary}. "
            "Be concise — 3-4 sentences, focus on key wins and areas needing attention.",
        )
        return {"success": True, "message": report or "Report generation failed", "data": summary}

    def _reprocess_campaign(self, params: dict, actor: str) -> dict:
        campaign_id = params.get("campaign_id")
        if not campaign_id:
            return {"success": False, "message": "Provide campaign_id parameter"}
        from app.models.campaign import Campaign, CampaignStatus
        c = self.db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not c:
            return {"success": False, "message": f"Campaign {campaign_id} not found"}
        c.status = CampaignStatus.READY
        c.clips_generated = 0
        self.db.flush()
        from app.workers.video_tasks import acquire_content
        acquire_content.apply_async(args=[c.id], queue="acquisition")
        return {"success": True, "message": f"Reprocessing started for campaign: {c.title[:60]}"}

    def _pause_page(self, params: dict, actor: str) -> dict:
        from app.models.page import Page
        page_id = params.get("page_id")
        p = self.db.query(Page).filter(Page.id == page_id).first() if page_id else None
        if not p:
            return {"success": False, "message": "Page not found"}
        p.is_paused = True
        return {"success": True, "message": f"Page {p.name} paused"}

    def _resume_page(self, params: dict, actor: str) -> dict:
        from app.models.page import Page
        page_id = params.get("page_id")
        p = self.db.query(Page).filter(Page.id == page_id).first() if page_id else None
        if not p:
            return {"success": False, "message": "Page not found"}
        p.is_paused = False
        return {"success": True, "message": f"Page {p.name} resumed"}

    def _approve_clip(self, params: dict, actor: str) -> dict:
        from app.models.clip import Clip, ClipStatus
        clip_id = params.get("clip_id")
        clip = self.db.query(Clip).filter(Clip.id == clip_id).first() if clip_id else None
        if not clip:
            return {"success": False, "message": "Clip not found"}
        clip.status = ClipStatus.APPROVED
        clip.reviewed_by = actor
        self.db.flush()
        from app.workers.delivery_tasks import create_deliverable
        create_deliverable.apply_async(args=[clip_id], queue="delivery")
        return {"success": True, "message": f"Clip {clip_id[:8]} approved and queued for delivery"}

    def _reject_clip(self, params: dict, actor: str) -> dict:
        from app.models.clip import Clip, ClipStatus
        clip_id = params.get("clip_id")
        reason = params.get("reason", "Rejected by operator")
        clip = self.db.query(Clip).filter(Clip.id == clip_id).first() if clip_id else None
        if not clip:
            return {"success": False, "message": "Clip not found"}
        clip.status = ClipStatus.REJECTED_HUMAN
        clip.rejection_reason = reason
        clip.reviewed_by = actor
        self.db.flush()
        return {"success": True, "message": f"Clip {clip_id[:8]} rejected: {reason}"}

    def _seed_demo(self, params: dict, actor: str) -> dict:
        """Seed demo campaigns so the full pipeline works without Clipping.com credentials."""
        from app.agents.campaign_hunter import CampaignHunterAgent
        result = CampaignHunterAgent(self.db)._run_demo_mode()
        self.db.flush()
        return {"success": result.success, "message": result.data.get("message", "Demo seeded"), "data": result.data}

    def _show_ai_status(self, params: dict, actor: str) -> dict:
        """Report which AI providers are configured and which is active."""
        from app.core.config import get_settings
        s = get_settings()
        providers = []
        has_anthropic = bool(s.anthropic_api_key) and "sk-ant-..." not in s.anthropic_api_key
        has_gemini = bool(s.gemini_api_key)
        has_openai = bool(s.openai_api_key)
        has_ollama = bool(s.ollama_base_url)

        if has_anthropic:
            providers.append("Anthropic Claude (PAID — primary)")
        if has_gemini:
            providers.append(f"Google Gemini {s.gemini_model} (FREE — {'primary' if not has_anthropic else 'fallback'})")
        if has_ollama:
            providers.append(f"Ollama {s.ollama_model} (LOCAL/FREE — fallback)")
        if has_openai:
            providers.append("OpenAI gpt-4o-mini (PAID — last resort)")

        active = "Gemini (free)" if not has_anthropic and has_gemini else ("Anthropic" if has_anthropic else "Ollama")
        demo = "YES" if s.demo_mode else "NO (Clipping.com credentials configured)"

        return {
            "success": True,
            "message": f"Active AI: {active} | Demo mode: {demo}",
            "data": {
                "providers": providers,
                "active_primary": active,
                "demo_mode": s.demo_mode,
                "embeddings": "Gemini text-embedding-004 (free)" if has_gemini else "OpenAI (paid)",
            },
        }
