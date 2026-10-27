"""Bounded VFB framing and decoding. No font editor or native extension required."""

from __future__ import annotations
from dataclasses import dataclass, field
import json
import math
from pathlib import Path
import struct
from typing import Any

TTH = json.loads(Path(__file__).with_name("tth.json").read_text())

VERSION = "0.1.0"
REGISTRY = json.loads(Path(__file__).with_name("records.json").read_text())


class VfbError(ValueError):
    """A deterministic failure at an absolute byte offset and optional record ID."""

    def __init__(self, code: str, offset: int, record_id: int | None = None):
        self.code, self.offset, self.record_id = code, offset, record_id
        super().__init__(
            f"{code} at byte {offset}"
            + (f" (record {record_id})" if record_id is not None else "")
        )


@dataclass
class Record:
    id: int
    offset: int
    payload_offset: int
    raw: bytes
    name: str
    value: Any = None
    coverage: str = "retained_raw"


@dataclass
class VfbDocument:
    header: dict[str, int]
    records: list[Record]
    source: bytes
    diagnostics: list[dict[str, Any]] = field(default_factory=list)


class Cursor:
    def __init__(
        self,
        data: bytes,
        base: int = 0,
        record_id: int | None = None,
        encoding: str = "utf-8",
    ):
        self.data, self.base, self.id, self.encoding, self.pos = (
            data,
            base,
            record_id,
            encoding,
            0,
        )

    def fail(self, code: str):
        raise VfbError(code, self.base + self.pos, self.id)

    def take(self, n: int) -> bytes:
        if n < 0 or n > len(self.data) - self.pos:
            self.fail("truncated")
        p = self.pos
        self.pos += n
        return self.data[p : self.pos]

    def number(self, fmt: str):
        value = struct.unpack("<" + fmt, self.take(struct.calcsize("<" + fmt)))[0]
        if isinstance(value, float) and not math.isfinite(value):
            self.fail("nonfinite_number")
        return value

    def ev(self) -> int:
        b = self.number("B")
        if b <= 246:
            return b - 139
        if b <= 250:
            return (b - 247) * 256 + self.number("B") + 108
        if b <= 254:
            return -(b - 251) * 256 - self.number("B") - 108
        return int.from_bytes(self.take(4), "big", signed=True)

    def count(self) -> int:
        n = self.ev()
        if n < 0 or n > 1_000_000 or n > len(self.data) - self.pos:
            self.fail("invalid_count")
        return n

    def text(self, n: int) -> str:
        b = self.take(n)
        try:
            return b.decode(self.encoding)
        except UnicodeDecodeError:
            try:
                return b.decode("cp1252")
            except UnicodeDecodeError:
                self.fail("invalid_encoding")

    @property
    def remaining(self):
        return len(self.data) - self.pos


def read(source: bytes | bytearray | memoryview | str | Path) -> VfbDocument:
    """Read framing without discarding unknown entries; reject truncated files."""
    limit = 256 * 1024 * 1024
    if isinstance(source, (str, Path)):
        with Path(source).open("rb") as stream:
            data = stream.read(limit + 1)
    else:
        size = source.nbytes if isinstance(source, memoryview) else len(source)
        if size > limit:
            raise VfbError("size_limit", 0)
        data = bytes(source)
    if len(data) > limit:
        raise VfbError("size_limit", 0)
    c = Cursor(data)
    keys = [
        "signature",
        "app_version",
        "file_version",
        "version_major",
        "version_minor",
    ]
    vals = [c.number("I"), c.number("B"), c.number("B"), c.number("B"), c.number("B")]
    if vals[:4] != [0x464C571A, 49, 48, 3]:
        c.fail("unsupported_header")
    start = c.number("I")
    if start < 12 or start > len(data):
        c.fail("invalid_data_offset")
    c.pos = start
    records = []
    masters = 1
    ended = False
    while c.remaining:
        offset = c.pos
        tag = c.number("H")
        length = c.number("I" if tag & 0x8000 else "H")
        tag &= 0x7FFF
        if tag == 1410:
            length = 8 + 2 * masters  # FL3's length field predates MM payloads.
        payload = c.pos
        raw = c.take(length)
        records.append(
            Record(
                tag,
                offset,
                payload,
                raw,
                REGISTRY.get(str(tag), {}).get("name", str(tag)),
            )
        )
        if tag == 1503:
            if length != 2:
                c.fail("invalid_master_count")
            masters = int.from_bytes(raw, "little")
            if not 1 <= masters <= 16:
                c.fail("invalid_master_count")
        if len(records) > 1_000_000:
            c.fail("record_limit")
        if tag == 2:
            ended = True
            if c.remaining:
                c.fail("trailing_data")
            break
    if not ended:
        c.fail("missing_end_marker")
    return VfbDocument(dict(zip(keys, vals)), records, data)


def _nodes(c: Cursor):
    masters = c.ev()
    if not 1 <= masters <= 16:
        c.fail("invalid_master_count")
    c.ev()  # Allocation capacity is not the number of stored nodes.
    count = c.count()
    current = [[0, 0] for _ in range(masters)]
    nodes = []
    begun = False
    for _ in range(count):
        mode = c.number("B")
        kind = mode & 15
        if kind not in (0, 1, 3, 4) or (not begun and kind != 0):
            c.fail("invalid_node")
        begun = True
        points = [[] for _ in range(masters)]
        for _ in range(3 if kind == 3 else 1):
            for m in range(masters):
                current[m][0] += c.ev()
                current[m][1] += c.ev()
                points[m].append(current[m].copy())
        nodes.append(
            dict(
                type={0: "move", 1: "line", 3: "curve", 4: "qcurve"}[kind],
                flags=mode >> 4,
                points=points,
            )
        )
    return dict(num_masters=masters, nodes=nodes)


def _guides(c: Cursor, masters: int):
    result = {}
    for direction in ("h", "v"):
        guides = []
        for _ in range(c.count()):
            guides.append(
                [
                    dict(pos=c.ev(), angle=math.degrees(math.atan2(c.ev(), 10000)))
                    for _ in range(masters)
                ]
            )
        result[direction] = guides
    return result


def _glyph(c: Cursor, masters: int):
    if c.take(4) != b"\x01\x09\x07\x01":
        c.fail("invalid_glyph_header")
    g = {}
    while c.remaining:
        tag = c.number("B")
        if tag == 15:
            return g
        if tag == 1:
            g["name"] = c.text(c.count())
        elif tag == 8:
            g.update(_nodes(c))
            masters = g["num_masters"]
        elif tag == 2:
            g["metrics"] = [[c.ev(), c.ev()] for _ in range(masters)]
        elif tag == 4:
            g["guides"] = _guides(c, masters)
        elif tag == 5:
            components = []
            for _ in range(c.count()):
                comp = dict(gid=c.ev(), offsetX=[], offsetY=[], scaleX=[], scaleY=[])
                for _ in range(masters):
                    comp["offsetX"].append(c.ev())
                    comp["offsetY"].append(c.ev())
                    comp["scaleX"].append(c.number("d"))
                    comp["scaleY"].append(c.number("d"))
                components.append(comp)
            g["components"] = components
        elif tag == 6:
            pairs = {}
            for _ in range(c.count()):
                gid = c.ev()
                pairs[str(gid)] = [c.ev() for _ in range(masters)]
            g["kerning"] = pairs
        elif tag == 3:
            hints = {}
            for direction in ("h", "v"):
                hints[direction] = [
                    [dict(pos=c.ev(), width=c.ev()) for _ in range(masters)]
                    for _ in range(c.count())
                ]
            masks = []
            for _ in range(c.count()):
                kind = c.number("B")
                index = c.ev()
                if kind not in (1, 2, 255):
                    c.fail("invalid_hintmask")
                masks.append([{1: "h", 2: "v", 255: "r"}[kind], index])
            if masks:
                hints["hintmasks"] = masks
            if hints["h"] or hints["v"] or masks:
                g["hints"] = hints
        elif tag == 10:
            size = c.count()
            program = Cursor(c.take(size), c.base + c.pos - size, c.id)
            instructions = []
            for _ in range(program.count()):
                opcode = program.number("B")
                if str(opcode) not in TTH:
                    program.fail("unknown_hint_command")
                name, params = TTH[str(opcode)]
                instructions.append(
                    dict(cmd=name, params={key: program.ev() for key in params})
                )
            if [program.ev() for _ in range(3)] != [0, 0, 0] or program.remaining:
                program.fail("invalid_hint_trailer")
            if instructions:
                g["tth"] = instructions
        elif tag == 9:
            g["imported"] = _imported(c)
        else:
            c.fail("unknown_glyph_section")
    c.fail("missing_glyph_end")


def _imported(c: Cursor):
    out = {}
    while c.remaining:
        key = c.number("B")
        if key == 40:
            return out
        if key == 41:
            out["metrics"] = [c.ev() for _ in range(9)]
        elif key == 42:
            ends = [c.ev() for _ in range(c.count())]
            pts = []
            x = y = 0
            for _ in range(c.count()):
                x += c.ev()
                y += c.ev()
                pts.append([x, y, c.number("B")])
            out["endpoints"] = ends
            out["points"] = pts
        elif key in (43, 44):
            out[str(key)] = c.take(c.count()).hex(" ")
        else:
            c.fail("unknown_truetype_section")
    c.fail("missing_truetype_end")


def _special(kind: str, c: Cursor, masters: int):
    if kind == "ev_unsigned":
        return c.ev() & 0xFFFFFFFF
    if kind == "head_flags":
        n = c.ev()
        names = [
            "use_custom_tt_values",
            "create_vdmx",
            "create_characters",
            "create_hdmx",
            "create_vmtx",
        ]
        return dict(
            flags=[i for i in range(16) if n & (1 << i)],
            options=[name for i, name in enumerate(names) if n & (1 << (16 + i))],
        )
    if kind == "bits":
        return [
            i * 8 + j
            for i, b in enumerate(c.take(c.remaining))
            for j in range(8)
            if b & (1 << j)
        ]
    if kind == "glyph_flags":
        n = c.number("I")
        return dict(
            horizontal_3_stem=(n >> 30) & 1,
            vertical_3_stem=(n >> 31) & 1,
            other=[i for i in range(30) if n & (1 << i)],
        )
    if kind == "bitmap":
        origin = [c.ev(), c.ev()]
        size_units = [c.ev(), c.ev()]
        w, h = c.ev(), c.ev()
        n = c.count()
        if w < 0 or h < 0 or w * h > 64_000_000:
            c.fail("image_limit")
        stride = ((w + 15) // 16) * 2
        packed = Cursor(c.take(n), c.base + c.pos - n, c.id)
        flat = []
        while packed.remaining:
            run = packed.number("b")
            flat.extend(
                packed.take(run + 1) if run >= 0 else [packed.number("B")] * (1 - run)
            )
            if len(flat) > stride * h:
                c.fail("image_overflow")
        if len(flat) != stride * h:
            c.fail("image_size_mismatch")
        if getattr(c, "windows", False):
            flat = [255 - b for b in flat]
        rows = [flat[i * stride : (i + 1) * stride] for i in range(h)]
        preview = [
            "".join("█▉" if row[x // 8] & (128 >> (x % 8)) else " ▕" for x in range(w))
            for row in rows
        ]
        return dict(
            origin=origin,
            size_units=size_units,
            size_pixels=[w, h],
            bitmap=dict(data=rows, preview=preview),
        )
    if kind == "nodes":
        return _nodes(c)
    if kind == "glyph":
        return _glyph(c, masters)
    if kind == "mask":
        weights = [c.ev() / 1e8 for _ in range(c.count())]
        return dict(weight_vector=weights, **_nodes(c))
    if kind == "guides":
        return _guides(c, masters)
    if kind == "version":
        d = dict(platform="macos", version=[5, 2, 2, 128], owner=0)
        while c.remaining:
            key = c.number("B")
            if key == 0:
                return d
            v = c.ev()
            if key == 1:
                d["platform"] = "windows" if v == 0 else "macos"
            elif key == 2:
                d["version"] = [(v >> shift) & 255 for shift in (24, 16, 8, 0)]
            elif key == 3:
                d["owner"] = v
        c.fail("missing_version_end")
    if kind == "anchors":
        count = c.count()
        n = c.ev()
        if not 0 <= n <= 16:
            c.fail("invalid_master_count")
        out = []
        for _ in range(count):
            pairs = [[c.ev(), c.ev()] for _ in range(n)]
            out.append(dict(x=[p[0] for p in pairs], y=[p[1] for p in pairs]))
        return out
    if kind == "gdef":
        d = {}
        kind = c.ev()
        names = ["unassigned", "base", "ligature", "mark", "component"]
        if not 0 <= kind < len(names):
            c.fail("invalid_glyph_class")
        if kind:
            d["glyph_class"] = names[kind]
        anchors = []
        for _ in range(c.count()):
            name = c.text(c.count())
            x = c.ev()
            c.ev()
            y = c.ev()
            c.ev()
            a = dict(x=x, y=y)
            if name:
                a["name"] = name
            anchors.append(a)
        if anchors:
            d["anchors"] = anchors
        carets = [[c.ev(), c.ev()] for _ in range(c.count())]
        if carets:
            d["carets"] = carets
        classes = [c.ev() for _ in range(c.count())]
        if classes:
            d["ot_classes"] = classes
        return d
    if kind == "guide_properties":
        out = {}
        for direction in ("h", "v"):
            guides = []
            while True:
                index = c.ev()
                if index == 0:
                    break
                color = c.ev()
                name = c.text(c.count())
                g = dict(index=index)
                if color >= 0:
                    h = f"{color:06x}"
                    g["color"] = "#" + h[4:] + h[2:4] + h[:2]
                if name:
                    g["name"] = name
                guides.append(g)
            out[direction] = guides
        return out
    c.fail("unsupported_decoder")


def _schema(s: Any, c: Cursor, masters: int):
    if isinstance(s, str):
        if s == "raw":
            return c.take(c.remaining).hex(" ")
        if s in ("text", "lines"):
            t = c.text(c.remaining)
            if s == "text":
                return t.strip("\0")
            lines = []
            blanks = 0
            for line in t.splitlines():
                blanks = blanks + 1 if not line.strip() else 0
                if blanks <= 2:
                    lines.append(line)
            if len(lines) > 1:
                while lines and not lines[-1]:
                    lines.pop()
            return lines + [""]
        if s == "ptext":
            return c.text(c.count())
        if s == "ev":
            return c.ev()
        fmts = {
            "u8": "B",
            "i8": "b",
            "u16": "H",
            "i16": "h",
            "u32": "I",
            "i32": "i",
            "f64": "d",
        }
        if s in fmts:
            v = c.number(fmts[s])
            if isinstance(v, float) and not math.isfinite(v):
                c.fail("nonfinite_number")
            return v
        return _special(s, c, masters)
    op, *args = s
    if op == "tagged":
        out = {}
        while c.remaining:
            key = c.number("B")
            if key == args[1]:
                return out
            if str(key) not in args[0]:
                c.fail("unknown_dictionary_key")
            name, layout = args[0][str(key)]
            out[name] = _schema(layout, c, masters)
        c.fail("missing_dictionary_end")
    if op == "object":
        return {k: _schema(v, c, masters) for k, v in args}
    if op == "tuple":
        return [_schema(v, c, masters) for v in args]
    if op == "array":
        return [
            _schema(args[1], c, masters)
            for _ in range(c.count() if args[0] == "ev" else args[0])
        ]
    if op == "rest":
        out = []
        while c.remaining:
            before = c.pos
            out.append(_schema(args[0], c, masters))
            if c.pos == before:
                c.fail("nonprogressing_schema")
        return out
    if op == "map":
        out = {}
        for _ in range(c.count()):
            key = _schema(args[1], c, masters)
            out[key] = _schema(args[2], c, masters)
        return out
    c.fail("invalid_schema")


def decode(document: VfbDocument) -> VfbDocument:
    """Decode in record order; preserve original bytes and report raw coverage."""
    encoding = "utf-8"
    masters = 1
    windows = False
    document.diagnostics = []
    for r in document.records:
        schema = REGISTRY.get(str(r.id), {}).get("schema", "raw")
        c = Cursor(r.raw, r.payload_offset, r.id, encoding)
        c.windows = windows
        r.value = _schema(schema, c, masters)
        if c.remaining:
            c.fail("record_remainder")
        r.coverage = "retained_raw" if schema == "raw" else "decoded"
        if r.coverage == "retained_raw" and r.raw:
            document.diagnostics.append(
                dict(code="retained_raw", record_id=r.id, offset=r.offset)
            )
        if r.id == 10:
            v = r.value
            windows = v["platform"] == "windows"
            encoding = (
                "cp1252"
                if v["platform"] == "windows"
                else ("mac_roman" if tuple(v["version"]) <= (5, 0, 4, 128) else "utf-8")
            )
        if r.id == 1503:
            masters = r.value
    return document


def to_vfblib_json(document: VfbDocument) -> dict[str, Any]:
    """Return the pinned vfbLib header/entries envelope (see compatibility.md)."""
    decode(document)
    return dict(
        header=document.header, entries=[{r.name: r.value} for r in document.records]
    )


def validate(source: bytes | str | Path) -> list[dict[str, Any]]:
    """Return diagnostics; malformed input raises VfbError, never a partial font."""
    return decode(read(source)).diagnostics
