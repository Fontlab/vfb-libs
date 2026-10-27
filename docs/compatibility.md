# Compatibility profile: vfblib-927199c

The target is Python vfbLib commit
`927199c1705555add6786aee1de77df847d21dc9`, not its moving main branch and not the
Rust reader's currently different JSON profile. The envelope is `{header, entries}`;
each entry is a one-key object, preserving duplicates and input order. Binary
fallbacks use lowercase, space-separated hex. Decoded supported records use the
reference field names and shapes. No GPL implementation is linked or vendored.

This preview is **not a universal drop-in replacement for vfbLib**. The coverage
matrix defines which records have compatible decoded output. Raw-only entries
remain hex even when the reference implements a richer decoder. Decoded legacy
FL3 records may be richer than the reference's raw fallback. Python/Rust/TS APIs
are similar to one another, not source-compatible with Jens's mutable `Vfb` class.

Intentional differences:

- Negative bitmap upper-x bounds stay signed in the semantic document and JSON.
  The pinned reference converts this field to unsigned, producing values near
  2^32. A negative-coordinate bitmap in the private Lato sample demonstrates it.
  Keeping the signed value agrees with the FontLab reader and prevents enormous
  image scales. The differential harness names this exception explicitly.
- Imported binary TrueType subrecords use a documented low-level `imported` object
  (metrics, endpoints, points, instruction and hdmx bytes). They are retained
  source data, not executable outlines or hinting.
- Invalid framing and malformed known data raise structured errors. We do not
  reproduce silent short reads, native struct assumptions, or unbounded reads.
- Custom dictionary/pickle records remain raw and are never executed.
- Bitmap previews and guide angles are presentation data. Angles use a documented
  floating tolerance; integer geometry, raw bytes, and record ordering are exact.

## Helping Jens

`VfbDocument` corresponds to the Rust reader's `Vfb`; `records` corresponds to
`entries`; a record's raw buffer corresponds to `RawData`. Glyph `nodes` expose
the same move/line/curve/qcurve concepts. The record ID and compatibility name
remain alongside the decoded payload instead of being encoded only in an enum.

Start with the coverage matrix and conformance harness. Small MIT decoders,
fixtures, and format explanations can be reviewed independently. Public bugs or
contributions should contain synthetic minimal examples, never private fonts,
original FontLab sources, or production project data.
