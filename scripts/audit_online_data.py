"""Read-only production integrity audit. Exits non-zero when an invariant fails."""

import argparse
import json
import sys
import urllib.request


def fetch_json(base_url: str, path: str):
    with urllib.request.urlopen(f"{base_url.rstrip('/')}{path}", timeout=90) as response:
        return json.load(response)


def duplicate_count(values) -> int:
    values = list(values)
    return len(values) - len(set(values))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        default="https://office-courses-management.onrender.com",
    )
    args = parser.parse_args()

    employees = fetch_json(args.base_url, "/api/employees")
    courses = fetch_json(args.base_url, "/api/courses")
    progress = fetch_json(args.base_url, "/api/progress")
    enrollments = fetch_json(args.base_url, "/api/enrollments")
    storage = fetch_json(args.base_url, "/api/system/storage")

    users = {str(item["username"]) for item in employees}
    modules = {str(item["module_id"]) for item in courses if item.get("module_id")}
    course_names = {item.get("course_name") for item in courses}
    plan_names = {item.get("plan") for item in courses}

    checks = {
        "duplicate_users": duplicate_count(str(item["username"]) for item in employees),
        "duplicate_modules": duplicate_count(
            str(item["module_id"]) for item in courses if item.get("module_id")
        ),
        "duplicate_progress": duplicate_count(
            (
                str(item["username"]),
                str(item.get("module_id") or ""),
                item.get("course_name"),
                item.get("path"),
                item.get("module_name"),
            )
            for item in progress
        ),
        "invalid_enrollment_users": sum(
            str(item["username"]) not in users for item in enrollments
        ),
        "invalid_enrollment_targets": sum(
            item.get("target_name")
            not in (plan_names if item.get("target_type") == "plan" else course_names)
            for item in enrollments
        ),
        "invalid_progress_users": sum(
            str(item["username"]) not in users for item in progress
        ),
        "invalid_progress_modules": sum(
            bool(item.get("module_id")) and str(item["module_id"]) not in modules
            for item in progress
        ),
    }
    remote = storage.get("remote_store") or {}
    result = {
        "counts": {
            "employees": len(employees),
            "courses": len(courses),
            "progress": len(progress),
            "enrollments": len(enrollments),
        },
        "storage": {
            "backend": remote.get("backend"),
            "version": remote.get("version"),
            "backup_count": remote.get("backup_count"),
        },
        "checks": checks,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    healthy = remote.get("backend") == "neon" and not any(checks.values())
    return 0 if healthy else 1


if __name__ == "__main__":
    sys.exit(main())
