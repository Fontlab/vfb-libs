# @fontlab/vfb

Read-only native TypeScript reader for FontLab 3–5 VFB. No WASM, filesystem,
network, or Fognet dependency is needed by the library.

```ts
import {read, decode, toVfbLibJson, VfbError} from '@fontlab/vfb';
const document = decode(read(new Uint8Array(await file.arrayBuffer())));
const glyphs = document.records.filter(record => record.id === 2001);
const compatibleJson = toVfbLibJson(document);
```

`read` owns a source copy and retains ordered records with offsets and raw bytes.
`decode` fills values and diagnostics in place. Unknown top-level records stay
raw; malformed known records throw `VfbError` with `code`, `offset`, `recordId`.
`validate(bytes)` returns preservation diagnostics or throws. Do not mutate a
record's byte view while using its document.

The JSON profile targets Python vfbLib commit 927199c. Raw-only records are not
claimed as decoded compatibility; negative bitmap bounds remain signed. See the
repository docs/api.md and docs/compatibility.md for the complete contract.

Build: `npm install && npm run build`. Run `node cli.mjs Font.vfb` after building,
or `deno run --allow-read cli.ts Font.vfb` from source. CLI output is JSON on
stdout, errors on stderr, failure status 1. Run source tests from repository root
with `deno test --allow-read packages/typescript/tests`.
