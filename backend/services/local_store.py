"""Small in-process repository used when Supabase is not configured.

It makes the development server usable without silently pretending that a
database-backed operation succeeded.  It is deliberately process-local; set
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for durable deployments.
"""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from typing import Any


class LocalStore:
    def __init__(self) -> None:
        self.requests: dict[str, dict[str, Any]] = {}
        self.documents: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.items: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.messages: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.files: dict[str, bytes] = {}

    def reset(self) -> None:
        self.__init__()

    def clone(self, value: Any) -> Any:
        return deepcopy(value)


local_store = LocalStore()
