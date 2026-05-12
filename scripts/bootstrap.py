#!/usr/bin/env python3
"""Bootstrap AI-DRAKON dev environment after cloning the repo."""
import argparse
import shutil
import sys
from pathlib import Path

SERVICES = ["drakon-agent", "architect-agent", "docs-agent"]

MEMORY_DIRS = ["memory/architect", "memory/docs", "memory/shared"]


def main(root: Path) -> None:
    print("AI-DRAKON Bootstrap")

    for d in MEMORY_DIRS:
        path = root / d
        path.mkdir(parents=True, exist_ok=True)

    print(f"  Directories ready: {', '.join(MEMORY_DIRS)}")

    for svc in SERVICES:
        svc_path = root / "services" / svc
        if not svc_path.exists():
            continue
        example = svc_path / ".env.example"
        target = svc_path / ".env"
        if example.exists() and not target.exists():
            shutil.copy(example, target)
            print(f"  Created services/{svc}/.env from example")

    print("Bootstrap complete.")
    print("Edit .env files, then start services:")
    for svc in SERVICES:
        print(f"  cd services/{svc} && .venv/bin/python3 main.py &")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap AI-DRAKON project")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).parent.parent,
        help="Project root (default: repo root)",
    )
    args = parser.parse_args()
    main(args.root)
