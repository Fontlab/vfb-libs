"""Synthetic MIT test data. Encoders exist only here, not in the public API."""

from pathlib import Path
import struct

ROOT = Path(__file__).parent / "fixtures"


def ev(n):
    if -139 <= n <= 107:
        return bytes([n + 139])
    if 108 <= n <= 1131:
        return bytes([247 + (n - 108) // 256, (n - 108) % 256])
    if -1131 <= n <= -108:
        return bytes([251 + (-n - 108) // 256, (-n - 108) % 256])
    return b"\xff" + struct.pack(">i", n)


def record(tag, data=b""):
    return (
        struct.pack("<HI", tag | 32768, len(data)) + data
        if len(data) > 65535
        else struct.pack("<HH", tag, len(data)) + data
    )


def integers(*args):
    return b"".join(ev(n) for n in args)


def glyph(name, masters=1, component=False, quadratic=False):
    out = b"\x01\x09\x07\x01\x01" + ev(len(name)) + name.encode()
    # Every node has a list of points for each master; cubic wire order is end,c1,c2.
    nodes = (
        []
        if component
        else [
            (0, [[[10 + 10 * m, 0]] for m in range(masters)]),
            (4 if quadratic else 1, [[[100 + 50 * m, 500]] for m in range(masters)]),
            (1, [[[200 + 100 * m, 0]] for m in range(masters)]),
        ]
    )
    out += b"\x08" + integers(masters, len(nodes) * 8, len(nodes))
    positions = [[0, 0] for _ in range(masters)]
    for kind, points in nodes:
        out += bytes([kind])
        for j in range(len(points[0])):
            for m in range(masters):
                x, y = points[m][j]
                out += integers(x - positions[m][0], y - positions[m][1])
                positions[m] = [x, y]
    out += b"\x02" + b"".join(integers(400 + 100 * m, 0) for m in range(masters))
    if component:
        out += (
            b"\x05"
            + integers(1, 0)
            + b"".join(
                integers(30 + m * 10, 0) + struct.pack("<dd", 1, 1)
                for m in range(masters)
            )
        )
    else:
        out += (
            b"\x06"
            + integers(1, 1)
            + b"".join(ev(-40 - 20 * m) for m in range(masters))
        )
    return out + b"\x0f"


def font(masters=1, quadratic=False):
    body = (
        record(1)
        + record(4)
        + record(10, b"\x01\x8c\x02\xff\x05\x02\x02\x80\x03\x8b\x00")
    )
    body += (
        record(1027, b"Fixture")
        + record(1127, b"Regular")
        + record(1135, struct.pack("<H", 1000))
        + record(1503, struct.pack("<H", masters))
    )
    if masters > 1:
        body += (
            record(1513, struct.pack("<H", 1))
            + record(1514, b"Weight")
            + record(1515, struct.pack("<4I", 2, 0, 0, 0))
            + record(1516, struct.pack("<80d", 100, 0, 900, 1, *([0] * 76)))
            + record(1517, struct.pack("<2d", 1, 0))
        )
        for i in range(masters):
            body += record(1504, f"Master {i}".encode()) + record(
                1505, struct.pack("<I4d", i + 1, i, 0, 0, 0)
            )
    body += record(2001, glyph("A", masters, quadratic=quadratic)) + record(
        1250, struct.pack("<H", 65)
    )
    # One named anchor, explicit coordinates in every master.
    body += record(2018, integers(1, 1, 3) + b"top" + integers(100, -1, 500, -1, 0, 0))
    body += record(
        2029,
        integers(1, masters)
        + b"".join(integers(100 + 50 * m, 500) for m in range(masters)),
    )
    body += record(2007, integers(0, 0, 100, 100, 2, 2, 5) + bytes([3, 128, 0, 64, 0]))
    body += (
        record(2001, glyph("A.copy", masters, True))
        + record(30000, b"opaque\x00\xff")
        + record(5)
        + record(2)
    )
    return struct.pack("<IBBBBI", 0x464C571A, 49, 48, 3, 0, 44) + b"\0" * 32 + body


if __name__ == "__main__":
    ROOT.mkdir(exist_ok=True)
    for name, data in [
        ("static", font()),
        ("masters", font(2)),
        ("quadratic", font(2, True)),
    ]:
        (ROOT / (name + ".vfb")).write_bytes(data)
    (ROOT / "large.vfb").write_bytes(
        font()[:-4] + record(30001, b"x" * 70000) + record(2)
    )

if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "packages/rust/src/test-data"
    target.mkdir(exist_ok=True)
    (target / "masters.vfb").write_bytes((ROOT / "masters.vfb").read_bytes())

if __name__ == "__main__":
    versions = {
        "windows": bytes.fromhex("018b02ff05020401038b00"),
        "macroman": bytes.fromhex("018c02ff05000480038b00"),
        "utf8": bytes.fromhex("018c02ff05020280038b00"),
    }
    for name, encoding in [
        ("windows", "cp1252"),
        ("macroman", "mac_roman"),
        ("utf8", "utf-8"),
    ]:
        data = (
            font()
            .replace(record(1027, b"Fixture"), record(1027, "Café".encode(encoding)))
            .replace(
                record(10, bytes.fromhex("018c02ff05020280038b00")),
                record(10, versions[name]),
            )
        )
        (ROOT / (name + ".vfb")).write_bytes(data)
    # Visual hint program: two commands, followed by three zero trailer values.
    program = (
        integers(2)
        + bytes([1])
        + integers(3, 0)
        + bytes([4])
        + integers(2, 4, -1, 0)
        + integers(0, 0, 0)
    )
    old = glyph("A")
    new = old[:-1] + bytes([10]) + ev(len(program)) + program + bytes([15])
    (ROOT / "hints.vfb").write_bytes(
        font().replace(record(2001, old), record(2001, new))
    )
    # Legacy FontLab 3 glyph record layout; reference keeps many of these raw.
    old = glyph("A")
    start = old.index(bytes([8]), 7)
    contour = old[start + 1 : old.index(bytes([2]), start + 1)]
    legacy = (
        record(1236)
        + record(1235, struct.pack("<H", 1))
        + record(1232, b"A")
        + record(2002, contour)
        + record(1237, struct.pack("<h", 400))
        + record(1231)
    )
    (ROOT / "legacy.vfb").write_bytes(font().replace(record(2001, old), legacy))

if __name__ == "__main__":
    cubic = (
        bytes.fromhex("01090701018c43")
        + bytes([8])
        + integers(2, 0, 2)
        + bytes([0])
        + integers(0, 0, 0, 0)
        + bytes([3])
        + integers(100, 0, 200, 0, -100, 100, -200, 200, 100, 0, 200, 0)
        + bytes([2])
        + integers(400, 0, 500, 0)
        + bytes([15])
    )
    (ROOT / "cubic.vfb").write_bytes(
        font(2).replace(record(2001, glyph("A", 2)), record(2001, cubic))
    )

if __name__ == "__main__":
    (ROOT / "utf8-bom.vfb").write_bytes(
        font().replace(
            record(1027, b"Fixture"), record(1027, "\ufeffFixture".encode("utf-8"))
        )
    )
