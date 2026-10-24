"""Record the selected PDF Python and dependencies in the shared Skill runtime."""

import json
import sys
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
from uuid import uuid4


def main():
    record = {
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "executable": sys.executable,
        "packages": {name: version(name) for name in ("reportlab", "pypdf", "Pillow")},
    }
    directory = Path(__file__).resolve().parent.parent / ".runtime" / "environment"
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"python-{uuid4().hex}.json"
    with destination.open("x", encoding="utf-8") as output:
        json.dump(record, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(destination)


if __name__ == "__main__":
    main()
