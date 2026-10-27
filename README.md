# FontLab VFB readers

Three native, read-only libraries for FontLab 3–5 VFB files. TypeScript runs in a
browser, Node, or Deno; Python needs no native extension; Rust exposes a library
and command-line reader. The packages share a **data contract and fixtures**, not
a runtime or generated parser implementation.

Version 0.1.0 is a preview. It reads the VFB 3.0 header used by FontLab 3–5,
packed multiple-master glyphs, and the documented legacy record layouts. Unknown
records remain available as original bytes. This is not a VFB writer, a VFC
reader, a font compiler, or an implementation of the FontLab editor.

| Language | Package | Main operations |
| --- | --- | --- |
| TypeScript | `@fontlab/vfb` | `read`, `decode`, `toVfbLibJson`, `validate` |
| Python | `fontlab-vfb` / `fontlab_vfb` | `read`, `decode`, `to_vfblib_json`, `validate` |
| Rust | `fontlab-vfb` / `fontlab_vfb` | `read`, `read_file`, `decode`, `to_vfb_lib_json`, `validate` |

Package names are prepared locally; this repository does not imply a registry
release. See [API](docs/api.md), [format](docs/format.md),
[compatibility](docs/compatibility.md), [coverage](docs/coverage.md), and
[contributing](CONTRIBUTING.md). Each package has its own quick start.

## Development

Requirements: Python 3.11+, Deno 2, Node 22+ for building the TS package, and Rust
1.97.1 (pinned by rust-toolchain.toml).

```sh
python3 scripts/sync-spec.py
python3 tests/make_fixtures.py
PYTHONPATH=packages/python/src python3 -m unittest discover -s tests -p 'test_*.py'
deno test --allow-read packages/typescript/tests
cargo test --manifest-path packages/rust/Cargo.toml
cargo build --manifest-path packages/rust/Cargo.toml
python3 tests/conformance.py
```

For independent comparisons, check out vfbLib at the commit in
`spec/reference.json` and run `python3 tests/conformance.py --reference PATH`.
The reference is test-only and is never imported by any shipping library.
Add `--sample PATH.vfb` to check a private font without copying it into the repo.

## Attribution and provenance

Copyright © 2026 FontLab. MIT; see [LICENSE](LICENSE).

These are newly authored implementations informed by private consultation of
FontLab's format reader and independently checked against Jens Kutílek's
vfbLib. Original FontLab C++ files and vfbLib parser implementations are not
included. Public record IDs, compatibility field names, and command signatures
are interface information. This is not a claim of clean-room isolation: reference
implementations were inspected. See [PROVENANCE](PROVENANCE.md).
