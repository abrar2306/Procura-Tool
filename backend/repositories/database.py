import logging
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client = None


def get_db() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL", "").strip().strip("\"'")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip().strip("\"'")
        if url and key and (url.startswith("http://") or url.startswith("https://")):
            try:
                _supabase_client = create_client(url, key)
            except Exception as exc:  # noqa: BLE001 - fall back to local store
                logger.warning("Supabase client init failed (%s); using local store.", exc)
                _supabase_client = None
        elif not url or not key:
            logger.info("Supabase not configured; using in-memory local store.")
    return _supabase_client
