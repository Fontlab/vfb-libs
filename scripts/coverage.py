"""Generate the coverage table from the maintained record contract."""

from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
r = json.loads((root / "spec/records.json").read_text())
lines = [
    "# Record coverage",
    "",
    "Generated from `spec/records.json`; regenerate with `python3 scripts/coverage.py`.",
    "",
    "| ID | vfbLib name | Coverage |",
    "| --- | --- | --- |",
]
for k, v in sorted(r.items(), key=lambda kv: int(kv[0])):
    lines.append(f'| {k} | {v["name"]} | {v["coverage"]} |')
(root / "docs/coverage.md").write_text("\n".join(lines) + "\n")
