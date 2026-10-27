# API and ownership

The three libraries expose the same sequence:

1. `read(bytes)` validates header, framing, lengths, master count, and EOF.
2. `decode(document)` interprets entries in order and returns or mutates that same
   document. Repeated decoding produces the same data and diagnostics.
3. `toVfbLibJson(document)` (idiomatic spelling in each language) decodes and
   returns a JSON-compatible value. It does not write a font or a JSON file.
4. `validate(bytes)` reads and decodes; it returns preservation diagnostics or
   raises/returns the first structured format error.

Python `read` also accepts a path. Rust supplies `read_file`. TypeScript accepts
`Uint8Array` or `ArrayBuffer`; use the platform's filesystem API outside the
portable library. All implementations own a source copy. TS record byte ranges
are views of that owned copy; do not mutate them while decoding.

## Document

`header` contains signature and application/file version fields. `records` is an
ordered list, **not a map**: duplicate tags are meaningful. A record exposes its
numeric `id`, record `offset`, `payloadOffset` / `payload_offset`, `raw` bytes,
compatible `name`, decoded `value`, and `coverage`. `source` retains the complete
original file, including header padding. `diagnostics` identifies uninterpreted
nonempty records. Byte offsets are absolute, zero-based.

Decoded data preserves VFB's master ordering. A glyph's `nodes` retain the VFB
node model: a cubic has `[endpoint, firstControl, secondControl]` for each master.
Do not feed this ordering directly into an ordinary cubic pen. `qcurve` denotes
an off-curve quadratic control, not a completed quadratic segment. `flags` is the
upper nibble of the packed node byte: smooth is bit 0; an open move is bit 3.
Coordinates are absolute in decoded data. Components retain glyph indices and
per-master scale/offset vectors. References require the original glyph order.

## Errors and limits

`VfbError` carries `code`, `offset`, and `recordId` / `record_id`. Rust wraps it in
`Result`; Python and TS raise it. Truncation, invalid counts, unsupported header,
missing terminators, unknown glyph opcodes, nonfinite doubles, and image expansion
overflows are errors. A failed decode may have populated earlier records; never
use it as a successfully imported font. Unknown *top-level* tags are retained;
unknown glyph opcodes fail because their lengths cannot safely be inferred.

Default bounds are 256 MiB source, one million records or counted items, 16 masters,
and 64 million bitmap pixels. Counts are also bounded by remaining bytes.
Readers never deserialize Python pickle payloads, execute font programs, contact
services, or resolve feature include paths. File contents are data.

All three CLIs take one filename, print JSON to stdout, report failures on stderr,
and exit nonzero on failure. JSON object key order and whitespace are not an API;
array order and numeric values are. Floating guide angles may differ by a few ULPs
between language math libraries (conformance tolerance: 1e-10 relative).
