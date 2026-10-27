import { decode, read, toVfbLibJson, VfbError } from "../src/reader.ts";
const bytes = await Deno.readFile(
  new URL("../../../tests/fixtures/masters.vfb", import.meta.url),
);
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
Deno.test("retains masters, unknown bytes and repeatable JSON", () => {
  const d = decode(read(bytes));
  check(d.records.filter((r) => r.id === 2001).length === 2, "glyphs");
  check(d.records.find((r) => r.id === 1503)?.value === 2, "masters");
  check(d.records.find((r) => r.id === 30000)?.raw.at(-1) === 255, "unknown");
  check(
    JSON.stringify(toVfbLibJson(d)) === JSON.stringify(toVfbLibJson(d)),
    "repeatability",
  );
});
Deno.test("every truncation fails without partial success", () => {
  for (let i = 0; i < bytes.length; i++) {
    let failed = false;
    try {
      decode(read(bytes.subarray(0, i)));
    } catch (e) {
      check(e instanceof VfbError, "typed error");
      failed = true;
    }
    check(failed, `accepted ${i}`);
  }
});
Deno.test("source ownership and payload offsets", () => {
  const input = bytes.slice(), doc = read(input);
  input.fill(0);
  check(doc.source[0] === 26, "owns bytes");
  for (const record of doc.records) {
    check(
      record.raw.every((b, i) => doc.source[record.payloadOffset + i] === b),
      "offset",
    );
  }
});
