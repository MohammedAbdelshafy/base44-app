"""
Shared Redis client for caching, pub/sub, and distributed locks.
"""
import json
from contextlib import contextmanager
from typing import Any

import redis
from redis.exceptions import LockError

from app.core.config import get_settings

settings = get_settings()

_pool = redis.ConnectionPool.from_url(settings.redis_url, max_connections=20, decode_responses=True)


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=_pool)


def cache_set(key: str, value: Any, ttl_seconds: int = 3600) -> None:
    r = get_redis()
    r.setex(key, ttl_seconds, json.dumps(value))


def cache_get(key: str) -> Any | None:
    r = get_redis()
    raw = r.get(key)
    return json.loads(raw) if raw is not None else None


def cache_delete(key: str) -> None:
    get_redis().delete(key)


def publish_event(channel: str, payload: dict) -> None:
    """Publish a system event for real-time dashboard updates."""
    get_redis().publish(channel, json.dumps(payload))


@contextmanager
def distributed_lock(name: str, timeout: int = 60, blocking_timeout: int = 10):
    """Context manager for a Redis-backed distributed lock."""
    r = get_redis()
    lock = r.lock(f"lock:{name}", timeout=timeout, blocking_timeout=blocking_timeout)
    acquired = lock.acquire()
    if not acquired:
        raise LockError(f"Could not acquire lock: {name}")
    try:
        yield lock
    finally:
        try:
            lock.release()
        except LockError:
            pass  # Lock already expired — acceptable


def push_to_dlq(task_name: str, task_args: dict, error: str) -> None:
    """Push a failed task to the dead-letter queue for manual review."""
    r = get_redis()
    r.lpush(
        "dlq:failed_tasks",
        json.dumps({"task": task_name, "args": task_args, "error": error}),
    )
