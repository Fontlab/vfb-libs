# Contributing

Read docs/format.md and docs/compatibility.md before changing a decoder. Keep each
language idiomatic; parity is defined by data and errors, not identical source.

1. Add a minimal synthetic fixture to tests/make_fixtures.py, with annotated bytes
   and independent expected values. Do not generate the expected result using
   the decoder under test.
2. Define the record ID, compatible name, and wire schema in spec/records.json.
   Use a named custom decoder only when state or structural interpretation needs it.
3. Implement the decoder in each language. Keep every read bounded. Reject a
   truncated known structure; retain genuinely unknown top-level entries.
4. Regenerate packaged schemas, update docs/coverage.md, run language tests and
   tests/conformance.py. Run the pinned reference comparison where applicable.
5. Describe intentional differences and update the compatibility profile only
   deliberately. A new raw fallback is not equivalent to interpreted support.

No font collection is redistributed here. The fixture writer is test-only and is
not a public VFB writing API. Rust formatting uses cargo fmt; Python uses Black;
TypeScript uses deno fmt. A PR should include its behavior change, verification,
and updated coverage documentation. Do not copy either reference implementation.
