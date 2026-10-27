# fontlab-vfb (Rust)

A native, read-only FontLab 3–5 VFB reader. Tested with Rust 1.97.1.

```rust,no_run
use fontlab_vfb::{read_file, decode, to_vfb_lib_json};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut font = read_file("Font.vfb")?;
    decode(&mut font)?;
    for record in &font.records {
        if record.id == 2001 { println!("{}", record.value["name"]); }
    }
    let json = to_vfb_lib_json(&mut font)?;
    println!("{}", json);
    Ok(())
}
```

`read(&[u8])` copies the source. `decode(&mut document)` populates ordered records,
retains original bytes, and reports raw-only records. `validate` returns those
diagnostics or a `VfbError` carrying its code, absolute offset, and record ID.
Parsing errors do not panic. Internal schema invariants are checked into the
crate, rather than supplied by untrusted callers.

The JSON profile targets Python vfbLib commit 927199c, not the differently shaped
Rust vfbreader profile. Raw-only records remain hex. Negative bitmap bounds stay
signed. See the repository's docs/compatibility.md and CONTRIBUTING.md.

Run `cargo test`, then `cargo run --bin vfb-json -- Font.vfb`. The CLI writes JSON
to stdout and errors to stderr with exit status 1. No FontLab installation or
Fognet checkout is needed. The crate includes its schema resources and synthetic
unit-test fixture.
