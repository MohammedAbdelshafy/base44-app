"""
LeadIngestionAgent — ingests lead data from multiple sources and creates
clipping campaigns from them. This bridges the gap between:

1. MBM LeadPacks (CSV files at MBM/LeadPacks/)
2. DAWRIX dealing room (Supabase deals)
3. MBM-Social LeadFactory (JSON files at MBM-Social/Memory/Leads/)
4. Direct lead lists (wholesalers, distressed sellers, full packs)

Each lead source produces campaigns that the clipping pipeline can process.
"""

import csv
import json
import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.agents.base_agent import AgentResult, BaseAgent

MBM_ROOT = Path(os.environ.get("MBM_ROOT", r"C:\Users\omare\OneDrive\Desktop\AI\MBM"))
MBM_SOCIAL_ROOT = Path(os.environ.get("MBM_SOCIAL_ROOT", r"C:\Users\omare\OneDrive\Desktop\AI\MBM-Social"))


class LeadIngestionAgent(BaseAgent):
    name = "lead_ingestion"

    def run(
        self,
        source: str = "mbm_leadpacks",
        date_str: Optional[str] = None,
        max_campaigns: int = 10,
    ) -> AgentResult:
        dispatch = {
            "mbm_leadpacks": self._ingest_mbm_leadpacks,
            "mbm_social_leads": self._ingest_mbm_social_leads,
            "all": self._ingest_all,
        }
        handler = dispatch.get(source, self._ingest_mbm_leadpacks)
        return handler(date_str, max_campaigns)

    def _ingest_all(self, date_str: Optional[str], max_campaigns: int) -> AgentResult:
        results = {}
        for src in ["mbm_leadpacks", "mbm_social_leads"]:
            res = dispatch[src](date_str, max_campaigns)
            results[src] = res.data if res.success else {"error": res.error}
        return AgentResult.ok(results)

    def _ingest_mbm_leadpacks(self, date_str: Optional[str], max_campaigns: int) -> AgentResult:
        from app.models.campaign import Campaign, CampaignStatus

        dt = date_str or date.today().isoformat()
        pack_dir = MBM_ROOT / "LeadPacks" / f"Pack_{dt}"
        if not pack_dir.exists():
            return AgentResult.fail(f"Lead pack not found for {dt}")

        manifest_file = pack_dir / f"MANIFEST_{dt}.json"
        manifest = {}
        if manifest_file.exists():
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))

        campaigns_created = 0
        for csv_name, source_label in [
            ("FULL_PACK.csv", "full_pack"),
            ("DISTRESSED_SELLERS.csv", "distressed"),
            ("WHOLESALERS.csv", "wholesaler"),
        ]:
            csv_path = pack_dir / csv_name
            if not csv_path.exists():
                continue

            with open(csv_path, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if campaigns_created >= max_campaigns:
                        break
                    campaign = self._lead_row_to_campaign(row, source_label, pack_dir)
                    if campaign:
                        self.db.add(campaign)
                        self.db.flush()
                        campaigns_created += 1
                        self._audit("campaign", campaign.id, "from_lead", metadata={
                            "source": source_label,
                            "lead_pack_date": dt,
                        })

        self.db.commit()
        return AgentResult.ok({"date": dt, "campaigns_created": campaigns_created, "source": "mbm_leadpacks"})

    def _ingest_mbm_social_leads(self, date_str: Optional[str], max_campaigns: int) -> AgentResult:
        from app.models.campaign import Campaign, CampaignStatus

        leads_dir = MBM_SOCIAL_ROOT / "Memory" / "Leads"
        if not leads_dir.exists():
            return AgentResult.fail(f"MBM-Social leads directory not found: {leads_dir}")

        campaigns_created = 0
        for lead_file in sorted(leads_dir.glob("*.json"))[:max_campaigns]:
            try:
                lead = json.loads(lead_file.read_text(encoding="utf-8"))
            except Exception as e:
                self.logger.warning(f"Failed to read lead file {lead_file}: {e}")
                continue

            existing = self.db.query(Campaign).filter(
                Campaign.source_url == lead.get("lead_id", "")
            ).first()
            if existing:
                continue

            campaign = Campaign(
                title=f"Lead: {lead.get('contact', {}).get('name', lead.get('lead_id', 'Unknown'))}",
                brand_name=lead.get("campaign", "LeadGenerated"),
                status=CampaignStatus.DISCOVERED,
                source_url=lead.get("lead_id", ""),
                source_type="lead",
                requirements={
                    "lead_id": lead.get("lead_id"),
                    "contact": lead.get("contact"),
                    "criteria": lead.get("criteria"),
                    "score": lead.get("score"),
                    "purpose": lead.get("criteria", {}).get("purpose", "unknown"),
                },
                opportunity_score=lead.get("score", {}).get("overall", 5) / 10,
                is_active=True,
            )
            self.db.add(campaign)
            self.db.flush()
            campaigns_created += 1
            self._audit("campaign", campaign.id, "from_mbm_social_lead", metadata={
                "lead_id": lead.get("lead_id"),
                "score": lead.get("score"),
            })

        self.db.commit()
        return AgentResult.ok({"campaigns_created": campaigns_created, "source": "mbm_social_leads"})

    def _lead_row_to_campaign(self, row: dict, source_label: str, pack_dir: Path) -> Optional[object]:
        from app.models.campaign import Campaign, CampaignStatus

        name = row.get("name") or row.get("Name") or row.get("contact_name") or "Unknown"
        phone = row.get("phone") or row.get("Phone") or ""
        email = row.get("email") or row.get("Email") or ""
        address = row.get("address") or row.get("Address") or row.get("property_address") or ""
        notes = row.get("notes") or row.get("Notes") or ""

        source_id = f"{source_label}_{pack_dir.name}_{re.sub(r'[^a-zA-Z0-9]', '_', name)[:20]}"

        existing = self.db.query(Campaign).filter(
            Campaign.source_url == source_id
        ).first()
        if existing:
            return None

        campaign = Campaign(
            title=f"Lead: {name}",
            brand_name="MBM-Leads",
            status=CampaignStatus.DISCOVERED,
            source_url=source_id,
            source_type=source_label,
            requirements={
                "lead_name": name,
                "phone": phone,
                "email": email,
                "address": address,
                "notes": notes,
                "source_file": str(pack_dir),
                "source_label": source_label,
            },
            opportunity_score=0.5,
            is_active=True,
        )
        return campaign

    def _get_dawrix_leads(self) -> list[dict]:
        """Fetch active deals from DAWRIX Supabase."""
        try:
            from supabase import create_client

            supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
            supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
            if not supabase_url or not supabase_key:
                self.logger.info("Supabase not configured, skipping DAWRIX lead sync")
                return []

            client = create_client(supabase_url, supabase_key)
            result = client.table("deals").select("*").eq("status", "lead").limit(20).execute()
            return result.data if result.data else []
        except Exception as e:
            self.logger.warning(f"Failed to fetch DAWRIX leads: {e}")
            return []


dispatch = {
    "mbm_leadpacks": LeadIngestionAgent._ingest_mbm_leadpacks,
    "mbm_social_leads": LeadIngestionAgent._ingest_mbm_social_leads,
    "all": LeadIngestionAgent._ingest_all,
}
