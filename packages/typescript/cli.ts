import { read, toVfbLibJson } from "./src/reader.ts";
try {
  if (Deno.args.length !== 1) throw new Error("Usage: vfb-json FILE.vfb");
  console.log(
    JSON.stringify(
      toVfbLibJson(read(await Deno.readFile(Deno.args[0]!))),
      null,
      2,
    ),
  );
} catch (error) {
  console.error(String(error));
  Deno.exit(1);
}
