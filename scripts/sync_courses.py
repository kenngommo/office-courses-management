"""Safely synchronize course fields without replacing employee progress.

Dry-run is the default. Pass --apply to update queue and duration differences.
The command stops if either side contains missing modules because resolving
adds/deletes requires an explicit catalog migration rather than a blind sync.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.db_manager import get_courses  # noqa: E402


IDENTITY_FIELDS = ("plan", "course_name", "path", "module_name")


def identity(row):
    return tuple(str(row.get(field, "") or "").strip() for field in IDENTITY_FIELDS)


def request_json(url, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def build_diff(local, online):
    local_by_id = {identity(row): row for row in local}
    online_by_id = {identity(row): row for row in online}
    local_ids, online_ids = set(local_by_id), set(online_by_id)
    queue_changes, duration_changes = [], []
    for module_id in sorted(local_ids & online_ids):
        local_row, online_row = local_by_id[module_id], online_by_id[module_id]
        if bool(local_row.get("queue")) != bool(online_row.get("queue")):
            queue_changes.append((module_id, bool(local_row.get("queue"))))
        if (local_row.get("duration"), local_row.get("duration_minutes")) != (
            online_row.get("duration"), online_row.get("duration_minutes")
        ):
            duration_changes.append(
                (module_id, local_row.get("duration") or "", int(local_row.get("duration_minutes") or 0))
            )
    return local_ids - online_ids, online_ids - local_ids, queue_changes, duration_changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://office-courses-management.onrender.com")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    local, online = get_courses(), request_json(f"{base_url}/api/courses")
    missing, extra, queue_changes, duration_changes = build_diff(local, online)
    summary = {
        "local_modules": len(local),
        "online_modules": len(online),
        "missing_online": len(missing),
        "extra_online": len(extra),
        "queue_changes": len(queue_changes),
        "duration_changes": len(duration_changes),
        "applied": False,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if missing or extra:
        raise SystemExit("Catalog identities differ; refusing a destructive automatic sync.")
    if not args.apply:
        return

    for module_id, queue in queue_changes:
        plan, course_name, path, module_name = module_id
        request_json(
            f"{base_url}/api/courses/toggle-active",
            "POST",
            {"plan": plan, "course_name": course_name, "path": path or None, "module_name": module_name, "queue": queue},
        )
    for module_id, duration, duration_minutes in duration_changes:
        plan, course_name, path, module_name = module_id
        request_json(
            f"{base_url}/api/courses/update-duration",
            "POST",
            {
                "plan": plan,
                "course_name": course_name,
                "path": path or None,
                "module_name": module_name,
                "duration": duration,
                "duration_minutes": duration_minutes,
            },
        )
    summary["applied"] = True
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
