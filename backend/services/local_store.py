"""Small in-process repository used when Supabase is not configured.

It makes the development server usable without silently pretending that a
database-backed operation succeeded.  It is deliberately process-local but is
persisted to a JSON file so that uvicorn ``--reload`` restarts do not wipe
in-progress data (requests, extracted items, analyses, seeded benchmarks).

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for durable multi-process storage.
"""

from __future__ import annotations

import json
import os
import tempfile
from collections import defaultdict
from copy import deepcopy
from threading import RLock
from typing import Any


def _default_path() -> str:
    configured = os.environ.get("LOCAL_STORE_PATH")
    if configured:
        return configured
    return os.path.join(tempfile.gettempdir(), "procura_local_store.json")


class LocalStore:
    def __init__(self, path: str | None = None) -> None:
        self._lock = RLock()
        self._path = path or _default_path()
        self.requests: dict[str, dict[str, Any]] = {}
        self.documents: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.items: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.messages: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.files: dict[str, bytes] = {}
        self.catalog: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.matches: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.score_results: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._load()

    def reset(self) -> None:
        with self._lock:
            self.files.clear()
            self.requests.clear()
            self.documents.clear()
            self.items.clear()
            self.messages.clear()
            self.catalog.clear()
            self.matches.clear()
            self.score_results.clear()
            try:
                if os.path.exists(self._path):
                    os.remove(self._path)
            except OSError:
                pass

    def clone(self, value: Any) -> Any:
        return deepcopy(value)

    def _load(self) -> None:
        try:
            with open(self._path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            return
        self.requests = data.get("requests", {})
        self.documents = defaultdict(list, data.get("documents", {}))
        self.items = defaultdict(list, data.get("items", {}))
        self.messages = defaultdict(list, data.get("messages", {}))
        self.catalog = defaultdict(list, data.get("catalog", {}))
        self.matches = defaultdict(list, data.get("matches", {}))
        self.score_results = defaultdict(list, data.get("score_results", {}))

    def save(self) -> None:
        with self._lock:
            payload = {
                "requests": self.requests,
                "documents": self.documents,
                "items": self.items,
                "messages": self.messages,
                "catalog": self.catalog,
                "matches": self.matches,
                "score_results": self.score_results,
            }
            tmp = self._path + ".tmp"
            try:
                with open(tmp, "w", encoding="utf-8") as fh:
                    json.dump(payload, fh, default=str)
                os.replace(tmp, self._path)
            except OSError as exc:
                # Persistence is best-effort; never break the request on a write error.
                import logging

                logging.getLogger(__name__).warning(
                    "Failed to persist local store (%s): %s", self._path, exc
                )


local_store = LocalStore()