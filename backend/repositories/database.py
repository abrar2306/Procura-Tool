import os
from supabase import create_client, Client

_supabase_client = None


def get_db() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            _supabase_client = create_client(url, key)
    return _supabase_client
