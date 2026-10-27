# Implementation provenance

FontLab authorized new MIT implementations informed by its VFB format code.
The format work consulted the FontLab fontgate reader, record declarations,
packing definitions, and bitmap bounds/outline semantics privately. No original
FontLab source is shipped. No claim of clean-room development is made.

Jens Kutílek's Python vfbLib, pinned in spec/reference.json, supplies the external
JSON interface and an independent behavioral comparison. Its GPL source remains
outside this repository. Public interface names and numeric IDs were catalogued;
all runtime framing, schema interpretation, custom decoders, tests, and Fognet
adaptation were newly authored. The Rust vfbreader project informed the contributor
terminology map, not a source transplant.

The synthetic fixtures were authored for this project and are covered by MIT.
Private local acceptance files are not included, downloaded, or published.
