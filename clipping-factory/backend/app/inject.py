import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.models.campaign import Campaign, CampaignStatus
from app.models.page import Page
from sqlalchemy import select

async def inject():
    async with AsyncSessionLocal() as session:
        # Get all pages
        result = await session.execute(select(Page))
        pages = result.scalars().all()
        
        if not pages:
            print("No pages found.")
            return

        for i, page in enumerate(pages[:2]):
            # Create a mock campaign for this page
            campaign = Campaign(
                id=str(uuid.uuid4()),
                platform_campaign_id=f"camp_{i}_{page.id[:8]}",
                page_id=page.id,
                title=f"Auto-Injected Campaign for {page.name}",
                brand_name="DummyBrand",
                status=CampaignStatus.DISCOVERED,
                is_active=True,
                priority=5,
                source_url=page.settings.get("source_url", "https://youtube.com"),
                source_type="youtube",
                payment_per_accepted_clip=50.0,
                requirements={"duration_max": 60, "platform": "TikTok"}
            )
            session.add(campaign)
            print(f"Injected campaign '{campaign.title}' for page {page.name}")

        await session.commit()
        print("Success!")

if __name__ == "__main__":
    asyncio.run(inject())
