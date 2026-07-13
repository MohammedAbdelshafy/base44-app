---
name: runware
description: "Use when you need to write code to generate images or connect to Runware.ai, or perform image inference using Stable Diffusion or Flux."
---

# Runware.ai Skill

Use this skill when you need to write code or configure tools to use Runware's cloud image generation API.

## Core Concepts

Runware.ai is a cloud-based GPU endpoint optimized for ultra-fast media generation (under 1 second).

## Installation

```bash
pip install runware-sdk
```

## Quick Start Example (REST)

```python
import asyncio
from runware import Runware

async def main():
    async with Runware(api_key="YOUR_API_KEY", transport="rest") as client:
        images = await client.run({
            "taskType": "imageInference",
            "model": "runware:100@1",  # Replace with model ID
            "positivePrompt": "a beautiful forest",
            "width": 512,
            "height": 512,
            "numberResults": 1
        })
        for img in images:
            print(f"Generated URL: {img.imageURL}")

asyncio.run(main())
```

## Integration with Antigravity

- **API Key**: Store in `.env` as `RUNWARE_API_KEY`.
- **Client**: Import and use `from antigravity.core.runware_client import RunwareClient`.
