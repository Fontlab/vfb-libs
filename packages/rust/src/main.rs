fn main() {
    let result = (|| -> Result<(), Box<dyn std::error::Error>> {
        let args: Vec<_> = std::env::args_os().skip(1).collect();
        if args.len() != 1 {
            return Err("Usage: vfb-json FILE.vfb".into());
        }
        let mut d = fontlab_vfb::read_file(&args[0])?;
        let json = fontlab_vfb::to_vfb_lib_json(&mut d)?;
        println!("{}", serde_json::to_string_pretty(&json)?);
        Ok(())
    })();
    if let Err(e) = result {
        eprintln!("{e}");
        std::process::exit(1)
    }
}
