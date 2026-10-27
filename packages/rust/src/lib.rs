//! Read-only VFB parsing with ordered records and retained source bytes.
//! `read` validates framing; `decode` interprets records without discarding unknown data.
use serde::Serialize;
use serde_json::{json, Map, Value};
use std::{fmt, fs, path::Path, sync::OnceLock};

pub const VERSION: &str = "0.1.0";
#[derive(Debug, Clone, Serialize)]
pub struct VfbError {
    pub code: String,
    pub offset: usize,
    pub record_id: Option<u16>,
}
impl fmt::Display for VfbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{} at byte {} (record {:?})",
            self.code, self.offset, self.record_id
        )
    }
}
impl std::error::Error for VfbError {}
type Result<T> = std::result::Result<T, VfbError>;
#[derive(Debug, Clone, Serialize)]
pub struct Record {
    pub id: u16,
    pub offset: usize,
    pub payload_offset: usize,
    pub raw: Vec<u8>,
    pub name: String,
    pub value: Value,
    pub coverage: String,
}
#[derive(Debug, Clone, Serialize)]
pub struct VfbDocument {
    pub header: Value,
    pub records: Vec<Record>,
    pub source: Vec<u8>,
    pub diagnostics: Vec<Value>,
}
fn registry() -> &'static Value {
    static REG: OnceLock<Value> = OnceLock::new();
    REG.get_or_init(|| serde_json::from_str(include_str!("records.json")).expect("built-in schema"))
}
fn hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<Vec<_>>()
        .join(" ")
}
struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
    base: usize,
    id: Option<u16>,
    encoding: &'static encoding_rs::Encoding,
    windows: bool,
}
impl<'a> Cursor<'a> {
    fn new(data: &'a [u8], base: usize, id: Option<u16>) -> Self {
        Self {
            data,
            pos: 0,
            base,
            id,
            encoding: encoding_rs::UTF_8,
            windows: false,
        }
    }
    fn error(&self, code: &str) -> VfbError {
        VfbError {
            code: code.into(),
            offset: self.base + self.pos,
            record_id: self.id,
        }
    }
    fn remaining(&self) -> usize {
        self.data.len() - self.pos
    }
    fn take(&mut self, n: usize) -> Result<&'a [u8]> {
        if n > self.remaining() {
            return Err(self.error("truncated"));
        }
        let start = self.pos;
        self.pos += n;
        Ok(&self.data[start..self.pos])
    }
    fn byte(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }
    fn u16(&mut self) -> Result<u16> {
        Ok(u16::from_le_bytes(self.take(2)?.try_into().unwrap()))
    }
    fn u32(&mut self) -> Result<u32> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
    fn float(&mut self) -> Result<f64> {
        let v = f64::from_le_bytes(self.take(8)?.try_into().unwrap());
        if !v.is_finite() {
            return Err(self.error("nonfinite_number"));
        }
        Ok(v)
    }
    fn ev(&mut self) -> Result<i32> {
        let b = self.byte()?;
        Ok(match b {
            0..=246 => b as i32 - 139,
            247..=250 => (b as i32 - 247) * 256 + self.byte()? as i32 + 108,
            251..=254 => -(b as i32 - 251) * 256 - self.byte()? as i32 - 108,
            _ => i32::from_be_bytes(self.take(4)?.try_into().unwrap()),
        })
    }
    fn count(&mut self) -> Result<usize> {
        let n = self.ev()?;
        if n < 0 || n > 1_000_000 || n as usize > self.remaining() {
            return Err(self.error("invalid_count"));
        }
        Ok(n as usize)
    }
    fn text(&mut self, n: usize) -> Result<String> {
        let bytes = self.take(n)?;
        let (v, _, bad) = self.encoding.decode(bytes);
        if !bad {
            return Ok(v.into_owned());
        }
        let (v, _, bad) = encoding_rs::WINDOWS_1252.decode(bytes);
        if bad {
            return Err(self.error("invalid_encoding"));
        }
        Ok(v.into_owned())
    }
    fn ptext(&mut self) -> Result<String> {
        let n = self.count()?;
        self.text(n)
    }
}
/// Validate framing and retain the original source. Decoding is explicit.
pub fn read(data: &[u8]) -> Result<VfbDocument> {
    if data.len() > 256 * 1024 * 1024 {
        return Err(VfbError {
            code: "size_limit".into(),
            offset: 0,
            record_id: None,
        });
    }
    let mut c = Cursor::new(data, 0, None);
    let sig = c.u32()?;
    let app = c.byte()?;
    let file = c.byte()?;
    let major = c.byte()?;
    let minor = c.byte()?;
    if (sig, app, file, major) != (0x464c571a, 49, 48, 3) {
        return Err(c.error("unsupported_header"));
    }
    let start = c.u32()? as usize;
    if start < 12 || start > data.len() {
        return Err(c.error("invalid_data_offset"));
    }
    c.pos = start;
    let mut records = Vec::new();
    let mut masters = 1;
    let mut ended = false;
    while c.remaining() > 0 {
        let offset = c.pos;
        let word = c.u16()?;
        let id = word & 0x7fff;
        let mut length = if word & 0x8000 != 0 {
            c.u32()? as usize
        } else {
            c.u16()? as usize
        };
        if id == 1410 {
            length = 8 + 2 * masters
        }
        let payload_offset = c.pos;
        let raw = c.take(length)?.to_vec();
        if id == 1503 {
            if length != 2 {
                return Err(c.error("invalid_master_count"));
            }
            masters = u16::from_le_bytes(raw.as_slice().try_into().unwrap()) as usize;
            if !(1..=16).contains(&masters) {
                return Err(c.error("invalid_master_count"));
            }
        }
        let name = registry()[id.to_string()]["name"]
            .as_str()
            .map(String::from)
            .unwrap_or(id.to_string());
        records.push(Record {
            id,
            offset,
            payload_offset,
            raw,
            name,
            value: Value::Null,
            coverage: "retained_raw".into(),
        });
        if records.len() > 1_000_000 {
            return Err(c.error("record_limit"));
        }
        if id == 2 {
            ended = true;
            if c.remaining() > 0 {
                return Err(c.error("trailing_data"));
            }
            break;
        }
    }
    if !ended {
        return Err(c.error("missing_end_marker"));
    }
    Ok(VfbDocument {
        header: json!({"signature":sig,"app_version":app,"file_version":file,"version_major":major,"version_minor":minor}),
        records,
        source: data.to_vec(),
        diagnostics: Vec::new(),
    })
}
/// Read a filesystem path. I/O failures are distinguished from format errors.
pub fn read_file(path: impl AsRef<Path>) -> Result<VfbDocument> {
    let b = fs::read(path).map_err(|_| VfbError {
        code: "io_error".into(),
        offset: 0,
        record_id: None,
    })?;
    read(&b)
}
fn nodes(c: &mut Cursor) -> Result<Value> {
    let masters = c.ev()?;
    if !(1..=16).contains(&masters) {
        return Err(c.error("invalid_master_count"));
    }
    let m = masters as usize;
    c.ev()?;
    let count = c.count()?;
    let mut current = vec![[0i64; 2]; m];
    let mut nodes = Vec::new();
    for i in 0..count {
        let mode = c.byte()?;
        let kind = mode & 15;
        if ![0, 1, 3, 4].contains(&kind) || (i == 0 && kind != 0) {
            return Err(c.error("invalid_node"));
        }
        let mut points = vec![Vec::new(); m];
        for _ in 0..if kind == 3 { 3 } else { 1 } {
            for j in 0..m {
                current[j][0] += c.ev()? as i64;
                current[j][1] += c.ev()? as i64;
                points[j].push(current[j]);
            }
        }
        let name = match kind {
            0 => "move",
            1 => "line",
            3 => "curve",
            _ => "qcurve",
        };
        nodes.push(json!({"type":name,"flags":mode>>4,"points":points}));
    }
    Ok(json!({"num_masters":masters,"nodes":nodes}))
}
fn guides(c: &mut Cursor, masters: usize) -> Result<Value> {
    let mut out = Map::new();
    for dir in ["h", "v"] {
        let mut list = Vec::new();
        for _ in 0..c.count()? {
            let mut values = Vec::new();
            for _ in 0..masters {
                values.push(
                    json!({"pos":c.ev()?,"angle":(c.ev()? as f64).atan2(10000.0).to_degrees()}),
                );
            }
            list.push(json!(values));
        }
        out.insert(dir.into(), json!(list));
    }
    Ok(out.into())
}
fn imported(c: &mut Cursor) -> Result<Value> {
    let mut out = Map::new();
    while c.remaining() > 0 {
        let key = c.byte()?;
        match key {
            40 => return Ok(out.into()),
            41 => {
                let mut a = Vec::new();
                for _ in 0..9 {
                    a.push(c.ev()?)
                }
                out.insert("metrics".into(), json!(a));
            }
            42 => {
                let mut ends = Vec::new();
                for _ in 0..c.count()? {
                    ends.push(c.ev()?)
                }
                let mut points = Vec::new();
                let (mut x, mut y) = (0i64, 0i64);
                for _ in 0..c.count()? {
                    x += c.ev()? as i64;
                    y += c.ev()? as i64;
                    points.push(json!([x, y, c.byte()?]));
                }
                out.insert("endpoints".into(), json!(ends));
                out.insert("points".into(), json!(points));
            }
            43 | 44 => {
                let n = c.count()?;
                out.insert(key.to_string(), json!(hex(c.take(n)?)));
            }
            _ => return Err(c.error("unknown_truetype_section")),
        }
    }
    Err(c.error("missing_truetype_end"))
}
fn glyph(c: &mut Cursor, mut masters: usize) -> Result<Value> {
    if c.take(4)? != [1, 9, 7, 1] {
        return Err(c.error("invalid_glyph_header"));
    }
    let mut g = Map::new();
    while c.remaining() > 0 {
        match c.byte()? {
            15 => return Ok(g.into()),
            1 => {
                g.insert("name".into(), json!(c.ptext()?));
            }
            8 => {
                let n = nodes(c)?;
                masters = n["num_masters"].as_u64().unwrap() as usize;
                g.extend(n.as_object().unwrap().clone());
            }
            2 => {
                let mut a = Vec::new();
                for _ in 0..masters {
                    a.push([c.ev()?, c.ev()?]);
                }
                g.insert("metrics".into(), json!(a));
            }
            4 => {
                g.insert("guides".into(), guides(c, masters)?);
            }
            5 => {
                let mut a = Vec::new();
                for _ in 0..c.count()? {
                    let gid = c.ev()?;
                    let (mut x, mut y, mut sx, mut sy) =
                        (Vec::new(), Vec::new(), Vec::new(), Vec::new());
                    for _ in 0..masters {
                        x.push(c.ev()?);
                        y.push(c.ev()?);
                        sx.push(c.float()?);
                        sy.push(c.float()?);
                    }
                    a.push(json!({"gid":gid,"offsetX":x,"offsetY":y,"scaleX":sx,"scaleY":sy}));
                }
                g.insert("components".into(), json!(a));
            }
            6 => {
                let mut pairs = Map::new();
                for _ in 0..c.count()? {
                    let gid = c.ev()?;
                    let mut v = Vec::new();
                    for _ in 0..masters {
                        v.push(c.ev()?)
                    }
                    pairs.insert(gid.to_string(), json!(v));
                }
                g.insert("kerning".into(), pairs.into());
            }
            3 => {
                let mut h = Map::new();
                let mut nonempty = false;
                for dir in ["h", "v"] {
                    let mut a = Vec::new();
                    for _ in 0..c.count()? {
                        let mut values = Vec::new();
                        for _ in 0..masters {
                            values.push(json!({"pos":c.ev()?,"width":c.ev()?}));
                        }
                        a.push(json!(values));
                    }
                    nonempty |= !a.is_empty();
                    h.insert(dir.into(), json!(a));
                }
                let mut masks = Vec::new();
                for _ in 0..c.count()? {
                    let kind = c.byte()?;
                    let idx = c.ev()?;
                    let label = match kind {
                        1 => "h",
                        2 => "v",
                        255 => "r",
                        _ => return Err(c.error("invalid_hintmask")),
                    };
                    masks.push(json!([label, idx]));
                }
                if !masks.is_empty() {
                    nonempty = true;
                    h.insert("hintmasks".into(), json!(masks));
                }
                if nonempty {
                    g.insert("hints".into(), h.into());
                }
            }
            10 => {
                let size = c.count()?;
                let base = c.base + c.pos;
                let mut program = Cursor::new(c.take(size)?, base, c.id);
                let commands: Value =
                    serde_json::from_str(include_str!("tth.json")).expect("built-in TTH contract");
                let mut instructions = Vec::new();
                for _ in 0..program.count()? {
                    let opcode = program.byte()?;
                    let entry = &commands[opcode.to_string()];
                    if entry.is_null() {
                        return Err(program.error("unknown_hint_command"));
                    }
                    let mut params = Map::new();
                    for name in entry[1].as_array().unwrap() {
                        params.insert(name.as_str().unwrap().into(), json!(program.ev()?));
                    }
                    instructions.push(json!({"cmd":entry[0],"params":params}));
                }
                if [program.ev()?, program.ev()?, program.ev()?] != [0, 0, 0]
                    || program.remaining() > 0
                {
                    return Err(program.error("invalid_hint_trailer"));
                }
                if !instructions.is_empty() {
                    g.insert("tth".into(), json!(instructions));
                }
            }
            9 => {
                g.insert("imported".into(), imported(c)?);
            }
            _ => return Err(c.error("unknown_glyph_section")),
        }
    }
    Err(c.error("missing_glyph_end"))
}
fn special(kind: &str, c: &mut Cursor, masters: usize) -> Result<Value> {
    match kind {
        "ev_unsigned" => Ok(json!(c.ev()? as u32)),
        "head_flags" => {
            let n = c.ev()? as u32;
            let names = [
                "use_custom_tt_values",
                "create_vdmx",
                "create_characters",
                "create_hdmx",
                "create_vmtx",
            ];
            Ok(
                json!({"flags":(0..16).filter(|i|n&(1<<i)!=0).collect::<Vec<_>>(),"options":names.iter().enumerate().filter(|(i,_)|n&(1<<(16+i))!=0).map(|(_,name)|*name).collect::<Vec<_>>()}),
            )
        }

        "glyph_flags" => {
            let n = c.u32()?;
            Ok(
                json!({"horizontal_3_stem":(n>>30)&1,"vertical_3_stem":(n>>31)&1,"other":(0..30).filter(|i|n&(1<<i)!=0).collect::<Vec<_>>()}),
            )
        }
        "bitmap" => {
            let origin = [c.ev()?, c.ev()?];
            let units = [c.ev()?, c.ev()?];
            let w = c.ev()?;
            let h = c.ev()?;
            let n = c.count()?;
            if w < 0 || h < 0 || w as i64 * h as i64 > 64_000_000 {
                return Err(c.error("image_limit"));
            }
            let stride = ((w as usize + 15) / 16) * 2;
            let mut packed = Cursor::new(c.take(n)?, 0, c.id);
            let mut flat = Vec::new();
            while packed.remaining() > 0 {
                let run = packed.byte()? as i8;
                if run >= 0 {
                    flat.extend_from_slice(packed.take(run as usize + 1)?);
                } else {
                    let byte = packed.byte()?;
                    flat.extend(std::iter::repeat_n(byte, (1 - run as i16) as usize));
                }
                if flat.len() > stride * h as usize {
                    return Err(c.error("image_overflow"));
                }
            }
            if flat.len() != stride * h as usize {
                return Err(c.error("image_size_mismatch"));
            }
            if c.windows {
                for b in &mut flat {
                    *b = 255 - *b;
                }
            }
            let rows: Vec<_> = (0..h as usize)
                .map(|i| flat[i * stride..(i + 1) * stride].to_vec())
                .collect();
            let preview: Vec<String> = rows
                .iter()
                .map(|row| {
                    (0..w as usize)
                        .map(|x| {
                            if row[x / 8] & (128 >> (x % 8)) != 0 {
                                "█▉"
                            } else {
                                " ▕"
                            }
                        })
                        .collect()
                })
                .collect();
            Ok(
                json!({"origin":origin,"size_units":units,"size_pixels":[w,h],"bitmap":{"data":rows,"preview":preview}}),
            )
        }
        "nodes" => nodes(c),
        "glyph" => glyph(c, masters),
        "guides" => guides(c, masters),
        "mask" => {
            let mut weights = Vec::new();
            for _ in 0..c.count()? {
                weights.push(c.ev()? as f64 / 1e8)
            }
            let mut v = nodes(c)?;
            v["weight_vector"] = json!(weights);
            Ok(v)
        }
        "version" => {
            let mut v = json!({"platform":"macos","version":[5,2,2,128],"owner":0});
            while c.remaining() > 0 {
                let key = c.byte()?;
                if key == 0 {
                    return Ok(v);
                }
                let n = c.ev()?;
                match key {
                    1 => v["platform"] = json!(if n == 0 { "windows" } else { "macos" }),
                    2 => v["version"] = json!([24, 16, 8, 0].map(|s| ((n as u32) >> s) & 255)),
                    3 => v["owner"] = json!(n),
                    _ => (),
                }
            }
            Err(c.error("missing_version_end"))
        }
        "anchors" => {
            let count = c.count()?;
            let n = c.ev()?;
            if !(0..=16).contains(&n) {
                return Err(c.error("invalid_master_count"));
            }
            let mut a = Vec::new();
            for _ in 0..count {
                let (mut x, mut y) = (Vec::new(), Vec::new());
                for _ in 0..n {
                    x.push(c.ev()?);
                    y.push(c.ev()?);
                }
                a.push(json!({"x":x,"y":y}));
            }
            Ok(json!(a))
        }
        "gdef" => {
            let mut d = Map::new();
            let kind = c.ev()?;
            let names = ["unassigned", "base", "ligature", "mark", "component"];
            if !(0..5).contains(&kind) {
                return Err(c.error("invalid_glyph_class"));
            }
            if kind != 0 {
                d.insert("glyph_class".into(), json!(names[kind as usize]));
            }
            let mut anchors = Vec::new();
            for _ in 0..c.count()? {
                let name = c.ptext()?;
                let x = c.ev()?;
                c.ev()?;
                let y = c.ev()?;
                c.ev()?;
                let mut a = json!({"x":x,"y":y});
                if !name.is_empty() {
                    a["name"] = json!(name);
                }
                anchors.push(a);
            }
            if !anchors.is_empty() {
                d.insert("anchors".into(), json!(anchors));
            }
            let mut carets = Vec::new();
            for _ in 0..c.count()? {
                carets.push([c.ev()?, c.ev()?]);
            }
            if !carets.is_empty() {
                d.insert("carets".into(), json!(carets));
            }
            let mut classes = Vec::new();
            for _ in 0..c.count()? {
                classes.push(c.ev()?);
            }
            if !classes.is_empty() {
                d.insert("ot_classes".into(), json!(classes));
            }
            Ok(d.into())
        }
        "guide_properties" => {
            let mut out = Map::new();
            for dir in ["h", "v"] {
                let mut a = Vec::new();
                loop {
                    let index = c.ev()?;
                    if index == 0 {
                        break;
                    }
                    let color = c.ev()?;
                    let name = c.ptext()?;
                    let mut g = json!({"index":index});
                    if color >= 0 {
                        let h = format!("{color:06x}");
                        g["color"] = json!(format!("#{}{}{}", &h[4..], &h[2..4], &h[..2]));
                    }
                    if !name.is_empty() {
                        g["name"] = json!(name)
                    }
                    a.push(g);
                }
                out.insert(dir.into(), json!(a));
            }
            Ok(out.into())
        }
        "bits" => {
            let bytes = c.take(c.remaining())?;
            let mut bits = Vec::new();
            for (i, b) in bytes.iter().enumerate() {
                for j in 0..8 {
                    if b & (1 << j) != 0 {
                        bits.push(i * 8 + j)
                    }
                }
            }
            Ok(json!(bits))
        }
        _ => Err(c.error("unsupported_decoder")),
    }
}
fn schema(s: &Value, c: &mut Cursor, masters: usize) -> Result<Value> {
    if let Some(kind) = s.as_str() {
        return match kind {
            "raw" => Ok(json!(hex(c.take(c.remaining())?))),
            "text" => Ok(json!(c.text(c.remaining())?.trim_matches('\0'))),
            "ptext" => Ok(json!(c.ptext()?)),
            "ev" => Ok(json!(c.ev()?)),
            "lines" => {
                let t = c.text(c.remaining())?;
                let mut lines = Vec::new();
                let mut blanks = 0;
                for line in t.lines() {
                    if line.trim().is_empty() {
                        blanks += 1;
                        if blanks <= 2 {
                            lines.push(line)
                        }
                    } else {
                        blanks = 0;
                        lines.push(line)
                    }
                }
                if lines.len() > 1 {
                    while lines.last() == Some(&"") {
                        lines.pop();
                    }
                }
                lines.push("");
                Ok(json!(lines))
            }
            "u8" => Ok(json!(c.byte()?)),
            "i8" => Ok(json!(c.byte()? as i8)),
            "u16" => Ok(json!(c.u16()?)),
            "i16" => Ok(json!(c.u16()? as i16)),
            "u32" => Ok(json!(c.u32()?)),
            "i32" => Ok(json!(c.u32()? as i32)),
            "f64" => Ok(json!(c.float()?)),
            _ => special(kind, c, masters),
        };
    }
    let a = s.as_array().expect("built-in schema array");
    let op = a[0].as_str().unwrap();
    match op {
        "tagged" => {
            let mut out = Map::new();
            while c.remaining() > 0 {
                let key = c.byte()?;
                if json!(key) == a[2] {
                    return Ok(out.into());
                }
                let pair = &a[1][key.to_string()];
                if pair.is_null() {
                    return Err(c.error("unknown_dictionary_key"));
                }
                out.insert(
                    pair[0].as_str().unwrap().into(),
                    schema(&pair[1], c, masters)?,
                );
            }
            Err(c.error("missing_dictionary_end"))
        }

        "object" => {
            let mut m = Map::new();
            for p in &a[1..] {
                m.insert(p[0].as_str().unwrap().into(), schema(&p[1], c, masters)?);
            }
            Ok(m.into())
        }
        "tuple" => {
            let mut v = Vec::new();
            for s in &a[1..] {
                v.push(schema(s, c, masters)?)
            }
            Ok(json!(v))
        }
        "array" => {
            let n = if a[1] == "ev" {
                c.count()?
            } else {
                a[1].as_u64().unwrap() as usize
            };
            let mut v = Vec::new();
            for _ in 0..n {
                v.push(schema(&a[2], c, masters)?)
            }
            Ok(json!(v))
        }
        "rest" => {
            let mut v = Vec::new();
            while c.remaining() > 0 {
                let before = c.pos;
                v.push(schema(&a[1], c, masters)?);
                if c.pos == before {
                    return Err(c.error("nonprogressing_schema"));
                }
            }
            Ok(json!(v))
        }
        "map" => {
            let mut m = Map::new();
            for _ in 0..c.count()? {
                let k = schema(&a[2], c, masters)?;
                m.insert(k.as_str().unwrap().into(), schema(&a[3], c, masters)?);
            }
            Ok(m.into())
        }
        _ => Err(c.error("invalid_schema")),
    }
}
/// Decode all records in place, preserving unknown bytes and returning coverage diagnostics.
pub fn decode(doc: &mut VfbDocument) -> Result<()> {
    let mut masters = 1;
    let mut encoding = encoding_rs::UTF_8;
    let mut windows = false;
    doc.diagnostics.clear();
    for r in &mut doc.records {
        let s = registry()[r.id.to_string()]["schema"].clone();
        let s = if s.is_null() { json!("raw") } else { s };
        let mut c = Cursor::new(&r.raw, r.payload_offset, Some(r.id));
        c.encoding = encoding;
        c.windows = windows;
        r.value = schema(&s, &mut c, masters)?;
        if c.remaining() > 0 {
            return Err(c.error("record_remainder"));
        }
        r.coverage = if s == "raw" {
            "retained_raw"
        } else {
            "decoded"
        }
        .into();
        if r.coverage == "retained_raw" && !r.raw.is_empty() {
            doc.diagnostics
                .push(json!({"code":"retained_raw","record_id":r.id,"offset":r.offset}));
        }
        if r.id == 10 {
            windows = r.value["platform"] == "windows";
            let n = r.value["version"]
                .as_array()
                .unwrap()
                .iter()
                .fold(0u64, |a, b| a * 256 + b.as_u64().unwrap());
            encoding = if r.value["platform"] == "windows" {
                encoding_rs::WINDOWS_1252
            } else if n <= 0x05000480 {
                encoding_rs::MACINTOSH
            } else {
                encoding_rs::UTF_8
            };
        }
        if r.id == 1503 {
            masters = r.value.as_u64().unwrap() as usize;
        }
    }
    Ok(())
}
/// Serialize the pinned vfbLib envelope; see compatibility.md for raw-only entries.
pub fn to_vfb_lib_json(doc: &mut VfbDocument) -> Result<Value> {
    decode(doc)?;
    let entries: Vec<_> = doc
        .records
        .iter()
        .map(|r| json!({r.name.clone():r.value.clone()}))
        .collect();
    Ok(json!({"header":doc.header,"entries":entries}))
}
/// Malformed input returns an error; supported input returns preservation diagnostics.
pub fn validate(data: &[u8]) -> Result<Vec<Value>> {
    let mut d = read(data)?;
    decode(&mut d)?;
    Ok(d.diagnostics)
}

#[cfg(test)]
mod tests {
    use super::*;
    const FIXTURE: &[u8] = include_bytes!("test-data/masters.vfb");
    #[test]
    fn masters_and_unknown_records() {
        let mut doc = read(FIXTURE).unwrap();
        decode(&mut doc).unwrap();
        assert_eq!(doc.records.iter().filter(|r| r.id == 2001).count(), 2);
        assert_eq!(
            doc.records.iter().find(|r| r.id == 1503).unwrap().value,
            json!(2)
        );
        assert_eq!(
            doc.records.iter().find(|r| r.id == 30000).unwrap().raw,
            b"opaque\0\xff"
        );
    }
    #[test]
    fn every_truncation_fails() {
        for n in 0..FIXTURE.len() {
            assert!(
                read(&FIXTURE[..n])
                    .and_then(|mut d| decode(&mut d))
                    .is_err(),
                "accepted {n}"
            );
        }
    }
    #[test]
    fn independent_source_and_offsets() {
        let mut input = FIXTURE.to_vec();
        let doc = read(&input).unwrap();
        input.fill(0);
        assert_eq!(doc.source[0], 26);
        for r in &doc.records {
            assert_eq!(
                r.raw,
                doc.source[r.payload_offset..r.payload_offset + r.raw.len()]
            );
        }
    }
}
