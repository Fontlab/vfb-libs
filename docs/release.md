# Preparing a release

Keep all three package versions synchronized. Update VERSION constants, package
metadata, changelog, coverage, and the pinned compatibility profile deliberately.
Regenerate the schema resources and run CI on a clean checkout. Test built
artifacts, not only source imports:

- TypeScript: npm install, npm run build, npm pack --dry-run; run cli.mjs.
- Python: python -m build packages/python; install the wheel in an empty venv and
  run vfb-json on a synthetic fixture. Check packaged JSON resources.
- Rust: cargo test and cargo package --allow-dirty; check the crate includes all
  JSON resources. No private fixture should be required to build or test a crate.

Prepare npm, PyPI, and crates.io artifacts locally. Publication requires a separate
explicit release decision and registry credentials. CI does not publish packages.
Fognet consumes a source snapshot with a source commit and per-file hashes; update
it using scripts/sync-vfb-library.py in tt-online and run its full verification.
