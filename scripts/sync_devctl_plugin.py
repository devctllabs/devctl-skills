#!/usr/bin/env python3
"""Synchronize standalone Devctl skills into the installable Codex plugin."""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = REPOSITORY_ROOT / "skills"
TARGET_ROOT = REPOSITORY_ROOT / "plugins" / "devctl" / "skills"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Synchronize Devctl skills into plugins/devctl/skills."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report drift without changing the generated plugin bundle.",
    )
    return parser.parse_args()


def is_devctl_skill(path: Path) -> bool:
    name = path.name
    return (
        path.is_dir()
        and (name == "devctl" or name.startswith("devctl-"))
        and (path / "SKILL.md").is_file()
    )


def discover_skills() -> list[Path]:
    skills = sorted(path for path in SOURCE_ROOT.iterdir() if is_devctl_skill(path))
    if not skills:
        raise RuntimeError(f"No Devctl skills found under {SOURCE_ROOT}")
    return skills


def ignored_names(_directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name == "__pycache__" or name == ".DS_Store" or name.endswith(".pyc")
    }


def is_ignored(path: Path) -> bool:
    return (
        "__pycache__" in path.parts
        or path.name == ".DS_Store"
        or path.name.endswith(".pyc")
    )


def source_files(skills: list[Path]) -> dict[Path, bytes]:
    files: dict[Path, bytes] = {}
    for skill in skills:
        for path in skill.rglob("*"):
            if path.is_file() and not is_ignored(path.relative_to(skill)):
                relative_path = Path(skill.name) / path.relative_to(skill)
                files[relative_path] = path.read_bytes()
    return files


def target_files() -> dict[Path, bytes]:
    if not TARGET_ROOT.is_dir():
        return {}
    return {
        path.relative_to(TARGET_ROOT): path.read_bytes()
        for path in TARGET_ROOT.rglob("*")
        if path.is_file() and not is_ignored(path.relative_to(TARGET_ROOT))
    }


def check(skills: list[Path]) -> int:
    expected = source_files(skills)
    actual = target_files()
    missing = sorted(expected.keys() - actual.keys())
    extra = sorted(actual.keys() - expected.keys())
    changed = sorted(
        path for path in expected.keys() & actual.keys() if expected[path] != actual[path]
    )

    if not (missing or extra or changed):
        print(f"Plugin bundle is in sync ({len(skills)} skills).")
        return 0

    print("Plugin bundle is out of sync:", file=sys.stderr)
    for label, paths in (("missing", missing), ("extra", extra), ("changed", changed)):
        for path in paths:
            print(f"  {label}: {path.as_posix()}", file=sys.stderr)
    print(
        "Run `python3 scripts/sync_devctl_plugin.py` to regenerate it.",
        file=sys.stderr,
    )
    return 1


def synchronize(skills: list[Path]) -> None:
    TARGET_ROOT.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(
        tempfile.mkdtemp(prefix=".devctl-skills-", dir=TARGET_ROOT.parent)
    )
    backup_parent: Path | None = None

    try:
        for skill in skills:
            shutil.copytree(
                skill,
                staging / skill.name,
                ignore=ignored_names,
            )

        if TARGET_ROOT.exists():
            backup_parent = Path(
                tempfile.mkdtemp(prefix=".devctl-skills-backup-", dir=TARGET_ROOT.parent)
            )
            TARGET_ROOT.rename(backup_parent / TARGET_ROOT.name)

        try:
            staging.rename(TARGET_ROOT)
        except Exception:
            if backup_parent is not None:
                (backup_parent / TARGET_ROOT.name).rename(TARGET_ROOT)
            raise
    finally:
        if staging.exists():
            shutil.rmtree(staging)
        if backup_parent is not None and backup_parent.exists():
            shutil.rmtree(backup_parent)

    print(f"Synced {len(skills)} Devctl skills to {TARGET_ROOT.relative_to(REPOSITORY_ROOT)}.")


def main() -> int:
    try:
        skills = discover_skills()
        if parse_args().check:
            return check(skills)
        synchronize(skills)
        return 0
    except (OSError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
