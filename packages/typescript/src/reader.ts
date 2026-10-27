/** Read-only FontLab 3–5 VFB decoding. See the shared specification for wire layouts. */
import { records as registry, tthCommands } from "./records.ts";
export const VERSION = "0.1.0";
export type Json = null | boolean | number | string | Json[] | {
  [key: string]: Json;
};
type ObjectValue = { [key: string]: Json };
export interface Diagnostic {
  code: string;
  record_id: number;
  offset: number;
}
export interface VfbRecord {
  id: number;
  offset: number;
  payloadOffset: number;
  raw: Uint8Array;
  name: string;
  value: Json;
  coverage: "decoded" | "retained_raw";
}
export interface VfbDocument {
  header: Record<string, number>;
  records: VfbRecord[];
  source: Uint8Array;
  diagnostics: Diagnostic[];
}
export interface VfbNode {
  type: "move" | "line" | "curve" | "qcurve";
  flags: number;
  points: number[][][];
}
export interface VfbComponent {
  gid: number;
  offsetX: number[];
  offsetY: number[];
  scaleX: number[];
  scaleY: number[];
}
export interface VfbGlyph {
  name: string;
  num_masters: number;
  nodes: VfbNode[];
  metrics?: number[][];
  components?: VfbComponent[];
  kerning?: Record<string, number[]>;
  guides?: Record<"h" | "v", Array<Array<{ pos: number; angle: number }>>>;
}
export class VfbError extends Error {
  readonly code: string;
  readonly offset: number;
  readonly recordId?: number;
  constructor(code: string, offset: number, recordId?: number) {
    super(
      `${code} at byte ${offset}${
        recordId === undefined ? "" : ` (record ${recordId})`
      }`,
    );
    this.name = "VfbError";
    this.code = code;
    this.offset = offset;
    this.recordId = recordId;
  }
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
class Cursor {
  pos = 0;
  windows = false;
  readonly data: Uint8Array;
  readonly base: number;
  readonly id?: number;
  readonly encoding: string;
  constructor(data: Uint8Array, base = 0, id?: number, encoding = "utf-8") {
    this.data = data;
    this.base = base;
    this.id = id;
    this.encoding = encoding;
  }
  get remaining() {
    return this.data.length - this.pos;
  }
  fail(code: string): never {
    throw new VfbError(code, this.base + this.pos, this.id);
  }
  take(n: number) {
    if (!Number.isSafeInteger(n) || n < 0 || n > this.remaining) {
      this.fail("truncated");
    }
    const start = this.pos;
    this.pos += n;
    return this.data.subarray(start, this.pos);
  }
  number(kind: string): number {
    const sizes: Record<string, number> = {
      u8: 1,
      i8: 1,
      u16: 2,
      i16: 2,
      u32: 4,
      i32: 4,
      f64: 8,
    };
    const b = this.take(sizes[kind]!);
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const n = kind === "u8"
      ? v.getUint8(0)
      : kind === "i8"
      ? v.getInt8(0)
      : kind === "u16"
      ? v.getUint16(0, true)
      : kind === "i16"
      ? v.getInt16(0, true)
      : kind === "u32"
      ? v.getUint32(0, true)
      : kind === "i32"
      ? v.getInt32(0, true)
      : v.getFloat64(0, true);
    if (!Number.isFinite(n)) this.fail("nonfinite_number");
    return n;
  }
  ev(): number {
    const b = this.number("u8");
    if (b <= 246) return b - 139;
    if (b <= 250) return (b - 247) * 256 + this.number("u8") + 108;
    if (b <= 254) return -(b - 251) * 256 - this.number("u8") - 108;
    const bytes = this.take(4);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getInt32(0, false);
  }
  count() {
    const n = this.ev();
    if (n < 0 || n > 1_000_000 || n > this.remaining) {
      this.fail("invalid_count");
    }
    return n;
  }
  text(n: number) {
    const bytes = this.take(n);
    try {
      return new TextDecoder(this.encoding, { fatal: true }).decode(bytes);
    } catch {
      try {
        return new TextDecoder("windows-1252", { fatal: true }).decode(bytes);
      } catch {
        return this.fail("invalid_encoding");
      }
    }
  }
}

/** Parse framing, retaining record order and source bytes. No decoding is implicit. */
export function read(input: Uint8Array | ArrayBuffer): VfbDocument {
  if (input.byteLength > 256 * 1024 * 1024) throw new VfbError("size_limit", 0);
  const source = input instanceof Uint8Array
    ? input.slice()
    : new Uint8Array(input.slice(0));
  if (source.length > 256 * 1024 * 1024) throw new VfbError("size_limit", 0);
  const c = new Cursor(source);
  const values = [
    c.number("u32"),
    c.number("u8"),
    c.number("u8"),
    c.number("u8"),
    c.number("u8"),
  ];
  if (values.slice(0, 4).join(",") !== "1179408154,49,48,3") {
    c.fail("unsupported_header");
  }
  const start = c.number("u32");
  if (start < 12 || start > source.length) c.fail("invalid_data_offset");
  c.pos = start;
  let masters = 1, ended = false;
  const records: VfbRecord[] = [];
  while (c.remaining) {
    const offset = c.pos;
    const word = c.number("u16");
    const id = word & 0x7fff;
    let length = c.number(word & 0x8000 ? "u32" : "u16");
    if (id === 1410) length = 8 + 2 * masters;
    const payloadOffset = c.pos, raw = c.take(length);
    records.push({
      id,
      offset,
      payloadOffset,
      raw,
      name: registry[String(id)]?.name ?? String(id),
      value: null,
      coverage: "retained_raw",
    });
    if (id === 1503) {
      if (length !== 2) c.fail("invalid_master_count");
      masters = raw[0]! + raw[1]! * 256;
      if (masters < 1 || masters > 16) c.fail("invalid_master_count");
    }
    if (records.length > 1_000_000) c.fail("record_limit");
    if (id === 2) {
      ended = true;
      if (c.remaining) c.fail("trailing_data");
      break;
    }
  }
  if (!ended) c.fail("missing_end_marker");
  const header = Object.fromEntries(
    [
      "signature",
      "app_version",
      "file_version",
      "version_major",
      "version_minor",
    ].map((k, i) => [k, values[i]!]),
  );
  return { header, records, source, diagnostics: [] };
}
function repeat<T>(n: number, fn: () => T): T[] {
  return Array.from({ length: n }, fn);
}
function nodes(c: Cursor): ObjectValue {
  const masters = c.ev();
  if (masters < 1 || masters > 16) c.fail("invalid_master_count");
  c.ev();
  const n = c.count();
  const current = repeat(masters, () => [0, 0]);
  const result: Json[] = [];
  for (let i = 0; i < n; i++) {
    const mode = c.number("u8"), kind = mode & 15;
    if (![0, 1, 3, 4].includes(kind) || (i === 0 && kind !== 0)) {
      c.fail("invalid_node");
    }
    const points = repeat(masters, () => [] as number[][]);
    for (let j = 0; j < (kind === 3 ? 3 : 1); j++) {
      for (let m = 0; m < masters; m++) {
        current[m]![0]! += c.ev();
        current[m]![1]! += c.ev();
        points[m]!.push([...current[m]!]);
      }
    }
    result.push({
      type: ({ 0: "move", 1: "line", 3: "curve", 4: "qcurve" } as Record<
        number,
        string
      >)[kind]!,
      flags: mode >> 4,
      points,
    });
  }
  return { num_masters: masters, nodes: result };
}
function guides(c: Cursor, masters: number): ObjectValue {
  return Object.fromEntries(
    ["h", "v"].map((dir) => [
      dir,
      repeat(c.count(), () =>
        repeat(
          masters,
          () => ({
            pos: c.ev(),
            angle: Math.atan2(c.ev(), 10000) * 180 / Math.PI,
          }),
        )),
    ]),
  );
}
function imported(c: Cursor): ObjectValue {
  const out: ObjectValue = {};
  while (c.remaining) {
    const key = c.number("u8");
    if (key === 40) return out;
    if (key === 41) out.metrics = repeat(9, () => c.ev());
    else if (key === 42) {
      out.endpoints = repeat(c.count(), () => c.ev());
      let x = 0, y = 0;
      out.points = repeat(c.count(), () => {
        x += c.ev();
        y += c.ev();
        return [x, y, c.number("u8")];
      });
    } else if (key === 43 || key === 44) {
      out[String(key)] = hex(c.take(c.count()));
    } else c.fail("unknown_truetype_section");
  }
  return c.fail("missing_truetype_end");
}
function glyph(c: Cursor, masters: number): ObjectValue {
  if (hex(c.take(4)) !== "01 09 07 01") c.fail("invalid_glyph_header");
  const g: ObjectValue = {};
  while (c.remaining) {
    const tag = c.number("u8");
    if (tag === 15) return g;
    if (tag === 1) g.name = c.text(c.count());
    else if (tag === 8) {
      Object.assign(g, nodes(c));
      masters = g.num_masters as number;
    } else if (tag === 2) g.metrics = repeat(masters, () => [c.ev(), c.ev()]);
    else if (tag === 4) g.guides = guides(c, masters);
    else if (tag === 5) {
      g.components = repeat(c.count(), () => {
        const comp = {
          gid: c.ev(),
          offsetX: [] as number[],
          offsetY: [] as number[],
          scaleX: [] as number[],
          scaleY: [] as number[],
        };
        for (let i = 0; i < masters; i++) {
          comp.offsetX.push(c.ev());
          comp.offsetY.push(c.ev());
          comp.scaleX.push(c.number("f64"));
          comp.scaleY.push(c.number("f64"));
        }
        return comp;
      });
    } else if (tag === 6) {
      const pairs: ObjectValue = {};
      const n = c.count();
      for (let i = 0; i < n; i++) {
        const id = c.ev();
        pairs[String(id)] = repeat(masters, () => c.ev());
      }
      g.kerning = pairs;
    } else if (tag === 3) {
      const h: ObjectValue = {};
      for (const direction of ["h", "v"]) {
        h[direction] = repeat(
          c.count(),
          () => repeat(masters, () => ({ pos: c.ev(), width: c.ev() })),
        );
      }
      const masks = repeat(c.count(), () => {
        const kind = c.number("u8"), index = c.ev();
        if (![1, 2, 255].includes(kind)) c.fail("invalid_hintmask");
        return [
          ({ 1: "h", 2: "v", 255: "r" } as Record<number, string>)[kind]!,
          index,
        ];
      });
      if (masks.length) h.hintmasks = masks;
      if ((h.h as Json[]).length || (h.v as Json[]).length || masks.length) {
        g.hints = h;
      }
    } else if (tag === 10) {
      const size = c.count(),
        program = new Cursor(c.take(size), c.base + c.pos - size, c.id),
        instructions: Json[] = [];
      for (let i = 0, n = program.count(); i < n; i++) {
        const opcode = program.number("u8"),
          command = tthCommands[String(opcode)];
        if (!command) program.fail("unknown_hint_command");
        instructions.push({
          cmd: command[0],
          params: Object.fromEntries(
            command[1].map((name) => [name, program.ev()]),
          ),
        });
      }
      if (
        [program.ev(), program.ev(), program.ev()].some((n) => n !== 0) ||
        program.remaining
      ) program.fail("invalid_hint_trailer");
      if (instructions.length) g.tth = instructions;
    } else if (tag === 9) g.imported = imported(c);
    else c.fail("unknown_glyph_section");
  }
  return c.fail("missing_glyph_end");
}
function special(kind: string, c: Cursor, masters: number): Json {
  if (kind === "ev_unsigned") return c.ev() >>> 0;
  if (kind === "head_flags") {
    const n = c.ev();
    return {
      flags: Array.from({ length: 16 }, (_, i) => i).filter((i) =>
        n & (1 << i)
      ),
      options: [
        "use_custom_tt_values",
        "create_vdmx",
        "create_characters",
        "create_hdmx",
        "create_vmtx",
      ].filter((_, i) => n & (1 << (16 + i))),
    };
  }
  if (kind === "bits") {
    return Array.from(c.take(c.remaining)).flatMap((b, i) =>
      Array.from({ length: 8 }, (_, j) => j).filter((j) => b & (1 << j)).map(
        (j) => i * 8 + j,
      )
    );
  }
  if (kind === "glyph_flags") {
    const n = c.number("u32");
    return {
      horizontal_3_stem: (n >>> 30) & 1,
      vertical_3_stem: (n >>> 31) & 1,
      other: Array.from({ length: 30 }, (_, i) => i).filter((i) =>
        (n >>> i) & 1
      ),
    };
  }
  if (kind === "bitmap") {
    const origin = [c.ev(), c.ev()],
      size_units = [c.ev(), c.ev()],
      w = c.ev(),
      h = c.ev(),
      n = c.count();
    if (w < 0 || h < 0 || w * h > 64_000_000) c.fail("image_limit");
    const stride = Math.ceil(w / 16) * 2,
      packed = new Cursor(c.take(n), c.base + c.pos - n, c.id),
      flat: number[] = [];
    while (packed.remaining) {
      const run = packed.number("i8");
      flat.push(
        ...(run >= 0
          ? packed.take(run + 1)
          : Array(1 - run).fill(packed.number("u8"))),
      );
      if (flat.length > stride * h) c.fail("image_overflow");
    }
    if (flat.length !== stride * h) c.fail("image_size_mismatch");
    const data = repeat(h, () => [] as number[]);
    for (let y = 0; y < h; y++) {
      data[y] = flat.slice(y * stride, (y + 1) * stride).map((b) =>
        c.windows ? 255 - b : b
      );
    }
    const preview = data.map((row) =>
      Array.from(
        { length: w },
        (_, x) => row[x >> 3]! & (128 >> (x % 8)) ? "█▉" : " ▕",
      ).join("")
    );
    return {
      origin,
      size_units,
      size_pixels: [w, h],
      bitmap: { data, preview },
    };
  }
  if (kind === "nodes") return nodes(c);
  if (kind === "glyph") return glyph(c, masters);
  if (kind === "mask") {
    const weight_vector = repeat(c.count(), () => c.ev() / 1e8);
    return { weight_vector, ...nodes(c) };
  }
  if (kind === "guides") return guides(c, masters);
  if (kind === "version") {
    const d: ObjectValue = {
      platform: "macos",
      version: [5, 2, 2, 128],
      owner: 0,
    };
    while (c.remaining) {
      const key = c.number("u8");
      if (key === 0) return d;
      const v = c.ev();
      if (key === 1) d.platform = v === 0 ? "windows" : "macos";
      else if (key === 2) {
        d.version = [24, 16, 8, 0].map((s) => (v >>> s) & 255);
      } else if (key === 3) d.owner = v;
    }
    return c.fail("missing_version_end");
  }
  if (kind === "anchors") {
    const count = c.count(), n = c.ev();
    if (n < 0 || n > 16) c.fail("invalid_master_count");
    return repeat(count, () => {
      const pairs = repeat(n, () => [c.ev(), c.ev()]);
      return { x: pairs.map((p) => p[0]!), y: pairs.map((p) => p[1]!) };
    });
  }
  if (kind === "gdef") {
    const d: ObjectValue = {},
      cls = c.ev(),
      names = ["unassigned", "base", "ligature", "mark", "component"];
    if (cls < 0 || cls >= names.length) c.fail("invalid_glyph_class");
    if (cls) d.glyph_class = names[cls]!;
    const anchors = repeat(c.count(), () => {
      const name = c.text(c.count()), x = c.ev();
      c.ev();
      const y = c.ev();
      c.ev();
      const a: ObjectValue = { x, y };
      if (name) a.name = name;
      return a;
    });
    if (anchors.length) d.anchors = anchors;
    const carets = repeat(c.count(), () => [c.ev(), c.ev()]);
    if (carets.length) d.carets = carets;
    const classes = repeat(c.count(), () => c.ev());
    if (classes.length) d.ot_classes = classes;
    return d;
  }
  if (kind === "guide_properties") {
    const out: ObjectValue = {};
    for (const dir of ["h", "v"]) {
      const list: Json[] = [];
      for (;;) {
        const index = c.ev();
        if (index === 0) break;
        const color = c.ev(), name = c.text(c.count());
        const g: ObjectValue = { index };
        if (color >= 0) {
          const h = color.toString(16).padStart(6, "0");
          g.color = "#" + h.slice(4) + h.slice(2, 4) + h.slice(0, 2);
        }
        if (name) g.name = name;
        list.push(g);
      }
      out[dir] = list;
    }
    return out;
  }
  return c.fail("unsupported_decoder");
}
function schema(s: Json, c: Cursor, masters: number): Json {
  if (typeof s === "string") {
    if (s === "raw") return hex(c.take(c.remaining));
    if (s === "text" || s === "lines") {
      const t = c.text(c.remaining);
      if (s === "text") return t.replace(/^\0+|\0+$/g, "");
      let blanks = 0;
      const lines = t.split(/\r\n|\n|\r/).filter((v, i, a) =>
        i < a.length - 1 || v !== ""
      ).filter((v) => {
        blanks = v.trim() ? 0 : blanks + 1;
        return blanks <= 2;
      });
      if (lines.length > 1) {
        while (lines.length && lines.at(-1) === "") lines.pop();
      }
      return [...lines, ""];
    }
    if (s === "ptext") return c.text(c.count());
    if (s === "ev") return c.ev();
    if (["u8", "i8", "u16", "i16", "u32", "i32", "f64"].includes(s)) {
      return c.number(s);
    }
    return special(s, c, masters);
  }
  const [op, ...args] = s as Json[];
  if (op === "tagged") {
    const out: ObjectValue = {};
    while (c.remaining) {
      const key = c.number("u8");
      if (key === args[1]) return out;
      const pair = (args[0] as ObjectValue)[String(key)] as Json[] | undefined;
      if (!pair) c.fail("unknown_dictionary_key");
      out[pair[0] as string] = schema(pair[1]!, c, masters);
    }
    return c.fail("missing_dictionary_end");
  }
  if (op === "object") {
    return Object.fromEntries(args.map((pair) => {
      const [key, value] = pair as Json[];
      return [key as string, schema(value!, c, masters)];
    }));
  }
  if (op === "tuple") return args.map((v) => schema(v, c, masters));
  if (op === "array") {
    return repeat(
      args[0] === "ev" ? c.count() : args[0] as number,
      () => schema(args[1]!, c, masters),
    );
  }
  if (op === "rest") {
    const out: Json[] = [];
    while (c.remaining) {
      const before = c.pos;
      out.push(schema(args[0]!, c, masters));
      if (before === c.pos) c.fail("nonprogressing_schema");
    }
    return out;
  }
  if (op === "map") {
    const out: ObjectValue = Object.create(null);
    const n = c.count();
    for (let i = 0; i < n; i++) {
      const k = schema(args[1]!, c, masters) as string;
      out[k] = schema(args[2]!, c, masters);
    }
    return out;
  }
  return c.fail("invalid_schema");
}
/** Decode in sequence so master count and text encoding follow the source. */
export function decode(document: VfbDocument): VfbDocument {
  let encoding = "utf-8", masters = 1, windows = false;
  document.diagnostics = [];
  for (const r of document.records) {
    const s = registry[String(r.id)]?.schema ?? "raw",
      c = new Cursor(r.raw, r.payloadOffset, r.id, encoding);
    c.windows = windows;
    r.value = schema(s, c, masters);
    if (c.remaining) c.fail("record_remainder");
    r.coverage = s === "raw" ? "retained_raw" : "decoded";
    if (r.coverage === "retained_raw" && r.raw.length) {
      document.diagnostics.push({
        code: "retained_raw",
        record_id: r.id,
        offset: r.offset,
      });
    }
    if (r.id === 10) {
      const v = r.value as ObjectValue;
      windows = v.platform === "windows";
      const version = v.version as number[];
      const old = version.reduce((n, b) => n * 256 + b, 0) <= 0x05000480;
      encoding = v.platform === "windows"
        ? "windows-1252"
        : old
        ? "macintosh"
        : "utf-8";
    }
    if (r.id === 1503) masters = r.value as number;
  }
  return document;
}
/** vfbLib-compatible envelope. Raw-only records and extensions are documented. */
export function toVfbLibJson(document: VfbDocument): Json {
  decode(document);
  return {
    header: document.header,
    entries: document.records.map((r) => ({ [r.name]: r.value })),
  };
}
export function validate(source: Uint8Array | ArrayBuffer): Diagnostic[] {
  return decode(read(source)).diagnostics;
}
