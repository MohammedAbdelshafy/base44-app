"""
S3-compatible storage client (MinIO in dev, AWS S3 in prod).
All file operations go through this module — never use boto3 directly elsewhere.
"""
import io
import os
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()


def _make_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint if not settings.is_production else None,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
        config=Config(
            signature_version="s3v4",
            connect_timeout=10,
            read_timeout=300,
        ),
        use_ssl=settings.storage_use_ssl,
    )


_client = None


def get_storage_client():
    global _client
    if _client is None:
        _client = _make_client()
    return _client


def ensure_buckets() -> None:
    """Create required buckets if they don't exist (idempotent)."""
    client = get_storage_client()
    for bucket in [
        settings.storage_bucket_source,
        settings.storage_bucket_clips,
        settings.storage_bucket_deliverables,
    ]:
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchBucket"):
                client.create_bucket(Bucket=bucket)
                print(f"[Storage] Created bucket: {bucket}")
            else:
                raise


def upload_file(
    local_path: str | Path,
    bucket: str,
    key: str,
    content_type: str = "application/octet-stream",
    metadata: dict | None = None,
) -> str:
    """Upload a local file and return its storage key."""
    client = get_storage_client()
    extra = {"ContentType": content_type}
    if metadata:
        extra["Metadata"] = {k: str(v) for k, v in metadata.items()}
    client.upload_file(str(local_path), bucket, key, ExtraArgs=extra)
    return key


def upload_bytes(
    data: bytes | BinaryIO,
    bucket: str,
    key: str,
    content_type: str = "application/octet-stream",
) -> str:
    client = get_storage_client()
    if isinstance(data, bytes):
        data = io.BytesIO(data)
    client.upload_fileobj(data, bucket, key, ExtraArgs={"ContentType": content_type})
    return key


def download_file(bucket: str, key: str, local_path: str | Path) -> Path:
    """Download a storage object to a local file."""
    local_path = Path(local_path)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    client = get_storage_client()
    client.download_file(bucket, key, str(local_path))
    return local_path


def download_bytes(bucket: str, key: str) -> bytes:
    client = get_storage_client()
    response = client.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def get_presigned_url(bucket: str, key: str, expiry_seconds: int = 3600) -> str:
    client = get_storage_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expiry_seconds,
    )


def delete_object(bucket: str, key: str) -> None:
    client = get_storage_client()
    client.delete_object(Bucket=bucket, Key=key)


def object_exists(bucket: str, key: str) -> bool:
    client = get_storage_client()
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError:
        return False


def list_objects(bucket: str, prefix: str = "") -> list[dict]:
    client = get_storage_client()
    paginator = client.get_paginator("list_objects_v2")
    objects = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        objects.extend(page.get("Contents", []))
    return objects


def get_object_size(bucket: str, key: str) -> int:
    client = get_storage_client()
    response = client.head_object(Bucket=bucket, Key=key)
    return response["ContentLength"]
