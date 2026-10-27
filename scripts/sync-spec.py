"""Regenerate package copies of the shared record contract; no network access."""

from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
data = (root / "spec/records.json").read_text()
(root / "packages/python/src/fontlab_vfb/records.json").write_text(data)
(root / "packages/rust/src/records.json").write_text(data)
(root / "packages/typescript/src/records.ts").write_text(
    '// Generated from spec/records.json by scripts/sync-spec.py.\nimport type {Json} from "./reader.ts";\nexport const records: Record<string, {name:string;schema:Json;coverage:string}> = '
    + data
    + ";\n"
)

tth = (root / "spec/tth.json").read_text()
(root / "packages/python/src/fontlab_vfb/tth.json").write_text(tth)
(root / "packages/rust/src/tth.json").write_text(tth)
with (root / "packages/typescript/src/records.ts").open("a") as out:
    out.write(
        "export const tthCommands:Record<string,[string,string[]]> = " + tth + ";\n"
    )
