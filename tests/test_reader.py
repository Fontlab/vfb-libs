"""Boundary, preservation, and semantic tests; no private fonts required."""

import unittest
import struct
from pathlib import Path
from fontlab_vfb import read, decode, to_vfblib_json, VfbError

ROOT = Path(__file__).parent / "fixtures"


class ReaderTests(unittest.TestCase):
    def test_masters_components_and_raw(self):
        d = decode(read(ROOT / "masters.vfb"))
        g = [r.value for r in d.records if r.id == 2001]
        self.assertEqual(g[0]["metrics"], [[400, 0], [500, 0]])
        self.assertEqual(g[1]["components"][0]["offsetX"], [30, 40])
        self.assertEqual(g[0]["kerning"], {"1": [-40, -60]})
        self.assertEqual(
            next(r.raw for r in d.records if r.id == 30000), b"opaque\0\xff"
        )

    def test_undefined_windows_character_is_rejected(self):
        b = (ROOT / "windows.vfb").read_bytes()
        r = next(r for r in read(b).records if r.id == 1027)
        damaged = bytearray(b)
        damaged[r.payload_offset] = 0x81
        with self.assertRaisesRegex(VfbError, "invalid_encoding"):
            decode(read(damaged))

    def test_fontlab_colorref_and_absent_metadata(self):
        document = decode(read(ROOT / "guide-colors.vfb"))
        for record in document.records:
            if record.id in (1296, 2031):
                self.assertEqual(
                    [g.get("color") for g in record.value["h"]],
                    ["#ff0000", "#ff5f5f", "#00ff00", None, "#000000"],
                )
        version = next(
            r.value
            for r in decode(read(ROOT / "metadata-absent.vfb")).records
            if r.id == 10
        )
        self.assertEqual(version, {})

    def test_all_truncations(self):
        b = (ROOT / "static.vfb").read_bytes()
        for n in range(len(b)):
            with self.subTest(n=n), self.assertRaises(VfbError):
                decode(read(b[:n]))

    def test_size_and_header_errors(self):
        b = bytearray((ROOT / "static.vfb").read_bytes())
        for offset, value in [(0, 0), (6, 2), (8, 255)]:
            damaged = b.copy()
            damaged[offset] = value
            with self.assertRaises(VfbError):
                decode(read(damaged))

    def test_long_records_and_repeat_decode(self):
        d = read(ROOT / "large.vfb")
        self.assertEqual(next(len(r.raw) for r in d.records if r.id == 30001), 70000)
        self.assertEqual(to_vfblib_json(d), to_vfblib_json(d))

    def test_record_error_offsets(self):
        b = bytearray((ROOT / "static.vfb").read_bytes())
        g = next(r for r in read(b).records if r.id == 2001)
        b[g.payload_offset] = 0
        with self.assertRaises(VfbError) as ctx:
            decode(read(b))
        self.assertEqual(ctx.exception.record_id, 2001)
        self.assertEqual(ctx.exception.offset, g.payload_offset + 4)

    def test_quadratic_nodes(self):
        d = decode(read(ROOT / "quadratic.vfb"))
        g = next(r.value for r in d.records if r.id == 2001)
        self.assertEqual(g["nodes"][1]["type"], "qcurve")

    def test_nonfinite_is_rejected(self):
        b = (ROOT / "static.vfb").read_bytes()
        bad = b[:-4] + struct.pack("<HHd", 1029, 8, float("nan")) + b[-4:]
        with self.assertRaisesRegex(VfbError, "nonfinite_number"):
            decode(read(bad))


if __name__ == "__main__":
    unittest.main()
