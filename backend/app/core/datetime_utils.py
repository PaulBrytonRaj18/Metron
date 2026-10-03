from datetime import datetime, timezone


def utc_now() -> datetime:
    """Returns timezone-aware UTC datetime compatible with Python 3.13+."""
    return datetime.now(timezone.utc)
