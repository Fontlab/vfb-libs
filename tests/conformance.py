"""Compare independently implemented Python, TS, and Rust readers and optional vfbLib.

Use --sample PATH for a private local acceptance font. Never copies that font.
Use --reference PATH for a checkout pinned to the commit in spec/reference.json.
"""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/python/src"))
from fontlab_vfb import read, decode, to_vfblib_json


def run(command, path):
    return json.loads(subprocess.check_output([*command, str(path)], cwd=ROOT))


def equal(a, b, path="$"):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if abs(a - b) <= 1e-10 * max(1, abs(a), abs(b)):
            return
    elif type(a) == type(b):
        if isinstance(a, dict):
            assert a.keys() == b.keys(), path
            for key in a:
                equal(a[key], b[key], path + "." + key)
            return
        if isinstance(a, list):
            assert len(a) == len(b), path
            for i, (x, y) in enumerate(zip(a, b)):
                equal(x, y, f"{path}[{i}]")
            return
        if a == b:
            return
    raise AssertionError(f"{path}: {a!r} != {b!r}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=Path)
    parser.add_argument("--reference", type=Path)
    args = parser.parse_args()
    if args.reference:
        pin = json.loads((ROOT / "spec/reference.json").read_text())["commit"]
        actual = subprocess.check_output(
            ["git", "-C", str(args.reference), "rev-parse", "HEAD"], text=True
        ).strip()
        assert actual == pin, "Reference checkout is not pinned"
        sys.path.insert(0, str(args.reference / "src"))
        from vfbLib.vfb.vfb import Vfb
    # Invalid Windows bytes must not be replaced or interpreted differently by language.
    damaged = bytearray((ROOT / "tests/fixtures/windows.vfb").read_bytes())
    record = next(r for r in read(damaged).records if r.id == 1027)
    damaged[record.payload_offset] = 0x81
    from fontlab_vfb import VfbError

    try:
        decode(read(damaged))
    except VfbError as error:
        assert error.code == "invalid_encoding"
    else:
        raise AssertionError("Python accepted invalid Windows text")
    with tempfile.TemporaryDirectory() as temp:
        path = Path(temp) / "invalid.vfb"
        path.write_bytes(damaged)
        for command in [
            ["deno", "run", "--allow-read", str(ROOT / "packages/typescript/cli.ts")],
            [str(ROOT / "packages/rust/target/debug/vfb-json")],
        ]:
            result = subprocess.run(
                [*command, str(path)], capture_output=True, text=True
            )
            assert (
                result.returncode != 0
                and not result.stdout
                and "invalid_encoding" in result.stderr
            )
    paths = sorted((ROOT / "tests/fixtures").glob("*.vfb")) + (
        [args.sample] if args.sample else []
    )
    for path in paths:
        doc = decode(read(path))
        expected = to_vfblib_json(doc)
        equal(
            expected,
            run(
                [
                    "deno",
                    "run",
                    "--allow-read",
                    str(ROOT / "packages/typescript/cli.ts"),
                ],
                path,
            ),
        )
        equal(expected, run([str(ROOT / "packages/rust/target/debug/vfb-json")], path))
        matched = 0
        known_differences = []
        if args.reference:
            reference = Vfb(path, timing=False)
            assert len(reference.entries) == len(doc.records), "Record count differs"
            for ours, theirs in zip(doc.records, reference.entries):
                assert ours.id == theirs.id
                # Never execute pickle entries, and never claim raw-only fields were interpreted.
                if ours.coverage != "decoded" or ours.id in (
                    1231,
                    1232,
                    1235,
                    1236,
                    1237,
                    1248,
                    2002,
                    2004,
                    2005,
                ):
                    continue
                theirs.decompile()
                other = json.loads(
                    json.dumps(theirs.data, default=lambda b: b.hex(" "))
                )
                if ours.id == 2007 and ours.value["size_units"][0] < 0:
                    other["size_units"][0] = other["size_units"][0] - (1 << 32)
                    known_differences.append("signed_bitmap_bounds")
                equal(ours.value, other, f"record[{ours.id}]@{ours.offset}")
                matched += 1
        print(
            f"{path.name}: {len(doc.records)} records; three implementations agree; reference matches={matched}; intentional differences={sorted(set(known_differences))}"
        )


if __name__ == "__main__":
    main()
