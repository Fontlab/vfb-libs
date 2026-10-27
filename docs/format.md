# VFB wire format used here

FontLab's VFB implementation is the semantic baseline. Readers expose stored data
and preserve unknown bytes; they do not synthesize authoring metadata or perform
editor-specific repairs. Internal fallbacks required to decode a legacy file do
not become fields presented as if they were stored. UI sign conversions, caret
centering, and optional hint processing belong in downstream adapters. The pinned
vfbLib implementation is a JSON-shape and differential reference; documented
FontLab semantics take precedence when the implementations disagree.

Multi-byte fixed-width values are little endian except the long encoded integer.

| Offset | Field |
| --- | --- |
| 0 | `1a 57 4c 46`, the VFB signature |
| 4–7 | app `31`, file `30`, major `03`, minor |
| 8 | unsigned 32-bit offset of the first record |
| 12… | retained header padding |

A record begins with a 16-bit tag. If bit 15 is set, the following length is
32 bits; otherwise it is 16 bits. Clear bit 15 to obtain the record ID. The
payload follows immediately. Record 2 is EOF. File/font/block markers have zero
length but retain their place in the record stream. FL3 MM kerning record 1410 is
an explicit exception: its payload is two 32-bit glyph indices followed by one
16-bit value per master; the old length field cannot be trusted.

Encoded integers: bytes through 246 encode `byte - 139`; 247–250 encode positive
two-byte values starting at 108; 251–254 encode their negative counterparts; 255
introduces a signed, big-endian 32-bit integer. `8b` is zero, `8c` is one,
`f7 00` is 108, and `ff ff ff ff ff` is -1.

Packed glyphs (2001) start `01 09 07 01`. Sections identify name, contours,
metrics, hints, guides, components, kerning, imported TrueType data, and visual
hint commands; 15 terminates a glyph. Outline point deltas have separate
accumulators for every master. Each point is followed across all masters before
the next point is read. Cubic endpoint coordinates precede their handles on wire.

Master names and locations are repeated records. Axis mapping counts select
valid pairs from fixed-capacity arrays: do not treat padding as authored knots.
Anisotropic mappings are separate from ordinary design/user mappings. The library
decodes both; applying them is the consuming editor's responsibility.

## Declarative record layouts

`spec/records.json` is the source of truth for record names, coverage, and layouts.
Primitive layouts include fixed numbers, encoded integers, text, and raw bytes.
`array`, `rest`, `tuple`, `object`, `map`, and `tagged` describe composite records.
Named custom decoders handle stateful glyphs, masks, guides, anchors, bitmaps,
flags, and application-version metadata. `spec/tth.json` records the public visual
hint command interface. The implementations of the reader and custom decoders
are native code in each language, not translations of a generated C++ parser.

Run `python3 scripts/sync-spec.py` after contract changes. It writes the TS table
and Python/Rust JSON resources. Generated resources are checked in so installing
any package does not require the monorepo or code generation.
