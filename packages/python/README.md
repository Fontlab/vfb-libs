# fontlab-vfb (Python)

A native, read-only FontLab 3–5 VFB reader, requiring Python 3.11 or newer.
There are no runtime dependencies or native extensions.

```python
from fontlab_vfb import read, decode, to_vfblib_json, VfbError
font = decode(read('Font.vfb'))       # bytes and pathlib.Path also work
for record in font.records:
    if record.id == 2001:
        print(record.value['name'])
compatible_json = to_vfblib_json(font)
```

`read` owns its source bytes; `decode` populates records and diagnostics in place.
Record order, duplicates, byte offsets, and raw payloads survive decoding.
`validate(source)` returns preservation diagnostics. Invalid known data raises
`VfbError(code, offset, record_id)`; failed decoding is not a valid partial font.
The package never executes custom dictionary/pickle entries or hint programs.

The JSON profile targets Python vfbLib commit 927199c. Raw-only entries and the
intentional signed-bitmap correction are documented in the repository's
`docs/compatibility.md`. This does not implement the mutable vfbLib Python API.

Install locally with `pip install .`; run `vfb-json Font.vfb` or
`python -m fontlab_vfb Font.vfb`. From a source checkout, set
`PYTHONPATH=packages/python/src` and run tests from the repository root.
