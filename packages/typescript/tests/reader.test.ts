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
Deno.test("FontLab colors and absent metadata are decoded without synthesized values", async () => {
  const document = decode(
    read(
      await Deno.readFile(
        new URL("../../../tests/fixtures/guide-colors.vfb", import.meta.url),
      ),
    ),
  );
  for (
    const record of document.records.filter((r) =>
      r.id === 1296 || r.id === 2031
    )
  ) {
    const guides = (record.value as { h: Array<{ color?: string }> }).h;
    check(
      JSON.stringify(guides.map((g) => g.color ?? null)) ===
        JSON.stringify(["#ff0000", "#ff5f5f", "#00ff00", null, "#000000"]),
      "COLORREF channels/sentinel",
    );
  }
  const empty = decode(
    read(
      await Deno.readFile(
        new URL("../../../tests/fixtures/metadata-absent.vfb", import.meta.url),
      ),
    ),
  );
  check(
    JSON.stringify(empty.records.find((r) => r.id === 10)!.value) === "{}",
    "version metadata must stay absent",
  );
});
