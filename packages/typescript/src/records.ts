// Generated from spec/records.json by scripts/sync-spec.py.
import type {Json} from "./reader.ts";
export const records: Record<string, {name:string;schema:Json;coverage:string}> = {
  "1": {
    "name": "Block File Data Start",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "4": {
    "name": "Block Font Start",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "10": {
    "name": "FL Version",
    "schema": "version",
    "coverage": "decoded"
  },
  "262": {
    "name": "Block Names Start",
    "schema": "text",
    "coverage": "decoded"
  },
  "1501": {
    "name": "Encoding Default",
    "schema": [
      "tuple",
      "u16",
      "text"
    ],
    "coverage": "decoded"
  },
  "1500": {
    "name": "Encoding",
    "schema": [
      "tuple",
      "u16",
      "text"
    ],
    "coverage": "decoded"
  },
  "1502": {
    "name": "MM Encoding Type",
    "schema": "u16",
    "coverage": "decoded"
  },
  "518": {
    "name": "Block Names End",
    "schema": "text",
    "coverage": "decoded"
  },
  "257": {
    "name": "Block Font Info Start",
    "schema": "text",
    "coverage": "decoded"
  },
  "1026": {
    "name": "font_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1503": {
    "name": "Master Count",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1517": {
    "name": "weight_vector",
    "schema": [
      "rest",
      "f64"
    ],
    "coverage": "decoded"
  },
  "1044": {
    "name": "unique_id",
    "schema": "i32",
    "coverage": "decoded"
  },
  "1046": {
    "name": "version",
    "schema": "text",
    "coverage": "decoded"
  },
  "1038": {
    "name": "notice",
    "schema": "text",
    "coverage": "decoded"
  },
  "1025": {
    "name": "full_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1027": {
    "name": "family_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1024": {
    "name": "pref_family_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1056": {
    "name": "menu_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1092": {
    "name": "apple_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1028": {
    "name": "weight",
    "schema": "text",
    "coverage": "decoded"
  },
  "1065": {
    "name": "width",
    "schema": "text",
    "coverage": "decoded"
  },
  "1069": {
    "name": "License",
    "schema": "text",
    "coverage": "decoded"
  },
  "1070": {
    "name": "License URL",
    "schema": "text",
    "coverage": "decoded"
  },
  "1037": {
    "name": "copyright",
    "schema": "text",
    "coverage": "decoded"
  },
  "1061": {
    "name": "trademark",
    "schema": "text",
    "coverage": "decoded"
  },
  "1062": {
    "name": "designer",
    "schema": "text",
    "coverage": "decoded"
  },
  "1063": {
    "name": "designer_url",
    "schema": "text",
    "coverage": "decoded"
  },
  "1064": {
    "name": "vendor_url",
    "schema": "text",
    "coverage": "decoded"
  },
  "1039": {
    "name": "source",
    "schema": "text",
    "coverage": "decoded"
  },
  "1034": {
    "name": "is_fixed_pitch",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1048": {
    "name": "weight_code",
    "schema": "i16",
    "coverage": "decoded"
  },
  "1029": {
    "name": "italic_angle",
    "schema": "f64",
    "coverage": "decoded"
  },
  "1047": {
    "name": "slant_angle",
    "schema": "f64",
    "coverage": "decoded"
  },
  "1030": {
    "name": "underline_position",
    "schema": "i16",
    "coverage": "decoded"
  },
  "1031": {
    "name": "underline_thickness",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1054": {
    "name": "ms_charset",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1118": {
    "name": "panose",
    "schema": [
      "rest",
      "i8"
    ],
    "coverage": "decoded"
  },
  "1128": {
    "name": "tt_version",
    "schema": "text",
    "coverage": "decoded"
  },
  "1129": {
    "name": "tt_u_id",
    "schema": "text",
    "coverage": "decoded"
  },
  "1127": {
    "name": "style_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1137": {
    "name": "pref_style_name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1139": {
    "name": "mac_compatible",
    "schema": "text",
    "coverage": "decoded"
  },
  "1140": {
    "name": "Sample Text",
    "schema": "text",
    "coverage": "decoded"
  },
  "1121": {
    "name": "vendor",
    "schema": "text",
    "coverage": "decoded"
  },
  "1133": {
    "name": "xuid",
    "schema": [
      "rest",
      "u32"
    ],
    "coverage": "decoded"
  },
  "1134": {
    "name": "xuid_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1132": {
    "name": "year",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1130": {
    "name": "version_major",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1131": {
    "name": "version_minor",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1135": {
    "name": "upm",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1090": {
    "name": "fond_id",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1093": {
    "name": "PostScript Hinting Options",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1068": {
    "name": "Collection",
    "schema": [
      "array",
      "ev",
      "ev"
    ],
    "coverage": "decoded"
  },
  "1530": {
    "name": "blue_values_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1531": {
    "name": "other_blues_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1532": {
    "name": "family_blues_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1533": {
    "name": "family_other_blues_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1534": {
    "name": "stem_snap_h_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1535": {
    "name": "stem_snap_v_num",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1267": {
    "name": "font_style",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1057": {
    "name": "pcl_id",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1058": {
    "name": "vp_id",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1060": {
    "name": "ms_id",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1059": {
    "name": "pcl_chars_set",
    "schema": "text",
    "coverage": "decoded"
  },
  "1261": {
    "name": "cvt",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1262": {
    "name": "prep",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1263": {
    "name": "fpgm",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1265": {
    "name": "gasp",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1264": {
    "name": "ttinfo",
    "schema": [
      "tagged",
      {
        "51": [
          "max_zones",
          "ev"
        ],
        "52": [
          "max_twilight_points",
          "ev"
        ],
        "53": [
          "max_storage",
          "ev"
        ],
        "54": [
          "max_function_defs",
          "ev"
        ],
        "55": [
          "max_instruction_defs",
          "ev"
        ],
        "56": [
          "max_stack_elements",
          "ev"
        ],
        "57": [
          "head_flags",
          "head_flags"
        ],
        "58": [
          "head_units_per_em",
          "ev"
        ],
        "59": [
          "head_mac_style",
          "ev"
        ],
        "60": [
          "head_lowest_rec_ppem",
          "ev"
        ],
        "61": [
          "head_font_direction_hint",
          "ev"
        ],
        "62": [
          "os2_us_weight_class",
          "ev"
        ],
        "63": [
          "os2_us_width_class",
          "ev"
        ],
        "64": [
          "os2_fs_type",
          "ev"
        ],
        "65": [
          "os2_y_subscript_x_size",
          "ev"
        ],
        "66": [
          "os2_y_subscript_y_size",
          "ev"
        ],
        "67": [
          "os2_y_subscript_x_offset",
          "ev"
        ],
        "68": [
          "os2_y_subscript_y_offset",
          "ev"
        ],
        "69": [
          "os2_y_superscript_x_size",
          "ev"
        ],
        "70": [
          "os2_y_superscript_y_size",
          "ev"
        ],
        "71": [
          "os2_y_superscript_x_offset",
          "ev"
        ],
        "72": [
          "os2_y_superscript_y_offset",
          "ev"
        ],
        "73": [
          "os2_y_strikeout_size",
          "ev"
        ],
        "74": [
          "os2_y_strikeout_position",
          "ev"
        ],
        "75": [
          "os2_s_family_class",
          "ev"
        ],
        "76": [
          "OpenTypeOS2Panose",
          [
            "array",
            10,
            "u8"
          ]
        ],
        "77": [
          "os2_s_typo_ascender",
          "ev"
        ],
        "78": [
          "os2_s_typo_descender",
          "ev"
        ],
        "79": [
          "os2_s_typo_line_gap",
          "ev"
        ],
        "80": [
          "os2_fs_selection",
          "ev"
        ],
        "81": [
          "os2_us_win_ascent",
          "ev"
        ],
        "82": [
          "os2_us_win_descent",
          "ev"
        ],
        "83": [
          "Hdmx PPMs 1",
          [
            "array",
            "ev",
            "u8"
          ]
        ],
        "84": [
          "Codepages",
          [
            "object",
            [
              "os2_ul_code_page_range1",
              "ev_unsigned"
            ],
            [
              "os2_ul_code_page_range2",
              "ev_unsigned"
            ]
          ]
        ],
        "86": [
          "head_creation",
          "ev"
        ],
        "87": [
          "head_creation2",
          "ev"
        ],
        "88": [
          "Hdmx PPMs 2",
          [
            "array",
            "ev",
            "u8"
          ]
        ],
        "89": [
          "hhea_line_gap",
          "ev"
        ],
        "90": [
          "hhea_ascender",
          "ev"
        ],
        "91": [
          "hhea_descender",
          "ev"
        ],
        "92": [
          "Average Width",
          "ev"
        ]
      },
      50
    ],
    "coverage": "decoded"
  },
  "1271": {
    "name": "vdmx",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1270": {
    "name": "hhea_line_gap",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1278": {
    "name": "hhea_ascender",
    "schema": "i16",
    "coverage": "decoded"
  },
  "1279": {
    "name": "hhea_descender",
    "schema": "i16",
    "coverage": "decoded"
  },
  "1266": {
    "name": "TrueType Stem PPEMs 2 And 3",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1268": {
    "name": "TrueType Stem PPEMs",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1269": {
    "name": "TrueType Stems",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1524": {
    "name": "TrueType Stem PPEMs 1",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1255": {
    "name": "TrueType Zones",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "2021": {
    "name": "unicoderanges",
    "schema": "bits",
    "coverage": "decoded"
  },
  "1272": {
    "name": "stemsnaplimit",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1274": {
    "name": "zoneppm",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1275": {
    "name": "codeppm",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1604": {
    "name": "dropoutppm",
    "schema": "u16",
    "coverage": "decoded"
  },
  "2032": {
    "name": "Measurement Line",
    "schema": "i16",
    "coverage": "decoded"
  },
  "1273": {
    "name": "TrueType Zone Deltas",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1138": {
    "name": "fontnames",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1141": {
    "name": "Custom CMAPs",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1136": {
    "name": "PCLT Table",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "2022": {
    "name": "Export PCLT Table",
    "schema": "u16",
    "coverage": "decoded"
  },
  "2025": {
    "name": "note",
    "schema": "text",
    "coverage": "decoded"
  },
  "2030": {
    "name": "Font Flags",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "2016": {
    "name": "customdata",
    "schema": "text",
    "coverage": "decoded"
  },
  "2024": {
    "name": "OpenType Metrics Class Flags",
    "schema": [
      "map",
      "ev",
      "ptext",
      [
        "tuple",
        "ev",
        "ev",
        "ev"
      ]
    ],
    "coverage": "decoded"
  },
  "2026": {
    "name": "OpenType Kerning Class Flags",
    "schema": [
      "map",
      "ev",
      "ptext",
      [
        "tuple",
        "ev",
        "ev"
      ]
    ],
    "coverage": "decoded"
  },
  "2014": {
    "name": "TrueTypeTable",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1276": {
    "name": "features",
    "schema": "lines",
    "coverage": "decoded"
  },
  "1277": {
    "name": "OpenType Class",
    "schema": "text",
    "coverage": "decoded"
  },
  "513": {
    "name": "Block Font Info End",
    "schema": "text",
    "coverage": "decoded"
  },
  "271": {
    "name": "Block MM Font Info Start",
    "schema": "text",
    "coverage": "decoded"
  },
  "1513": {
    "name": "Axis Count",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1514": {
    "name": "Axis Name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1523": {
    "name": "Anisotropic Interpolation Mappings",
    "schema": [
      "rest",
      [
        "array",
        "ev",
        [
          "tuple",
          "ev",
          "ev"
        ]
      ]
    ],
    "coverage": "decoded"
  },
  "1515": {
    "name": "Axis Mappings Count",
    "schema": [
      "rest",
      "u32"
    ],
    "coverage": "decoded"
  },
  "1516": {
    "name": "Axis Mappings",
    "schema": [
      "rest",
      [
        "tuple",
        "f64",
        "f64"
      ]
    ],
    "coverage": "decoded"
  },
  "1504": {
    "name": "Master Name",
    "schema": "text",
    "coverage": "decoded"
  },
  "1505": {
    "name": "Master Location",
    "schema": [
      "tuple",
      "u32",
      [
        "array",
        4,
        "f64"
      ]
    ],
    "coverage": "decoded"
  },
  "1247": {
    "name": "Primary Instance Locations",
    "schema": [
      "rest",
      "f64"
    ],
    "coverage": "decoded"
  },
  "1254": {
    "name": "Primary Instances",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1536": {
    "name": "PostScript Info",
    "schema": [
      "object",
      [
        "font_matrix",
        [
          "array",
          6,
          "f64"
        ]
      ],
      [
        "force_bold",
        "i32"
      ],
      [
        "blue_values",
        [
          "array",
          14,
          "i32"
        ]
      ],
      [
        "other_blues",
        [
          "array",
          10,
          "i32"
        ]
      ],
      [
        "family_blues",
        [
          "array",
          14,
          "i32"
        ]
      ],
      [
        "family_other_blues",
        [
          "array",
          10,
          "i32"
        ]
      ],
      [
        "blue_scale",
        "f64"
      ],
      [
        "blue_shift",
        "i32"
      ],
      [
        "blue_fuzz",
        "i32"
      ],
      [
        "std_hw",
        "i32"
      ],
      [
        "std_vw",
        "i32"
      ],
      [
        "stem_snap_h",
        [
          "array",
          12,
          "i32"
        ]
      ],
      [
        "stem_snap_v",
        [
          "array",
          12,
          "i32"
        ]
      ],
      [
        "bounding_box",
        [
          "object",
          [
            "xMin",
            "i16"
          ],
          [
            "yMin",
            "i16"
          ],
          [
            "xMax",
            "i16"
          ],
          [
            "yMax",
            "i16"
          ]
        ]
      ],
      [
        "adv_width_min",
        "i32"
      ],
      [
        "adv_width_max",
        "i32"
      ],
      [
        "adv_width_avg",
        "i32"
      ],
      [
        "ascender",
        "i32"
      ],
      [
        "descender",
        "i32"
      ],
      [
        "x_height",
        "i32"
      ],
      [
        "cap_height",
        "i32"
      ]
    ],
    "coverage": "decoded"
  },
  "527": {
    "name": "Block MM Font Info End",
    "schema": "text",
    "coverage": "decoded"
  },
  "1294": {
    "name": "Global Guides",
    "schema": "guides",
    "coverage": "decoded"
  },
  "1296": {
    "name": "Global Guide Properties",
    "schema": "guide_properties",
    "coverage": "decoded"
  },
  "1295": {
    "name": "Global Mask",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1066": {
    "name": "default_character",
    "schema": "text",
    "coverage": "decoded"
  },
  "2001": {
    "name": "Glyph",
    "schema": "glyph",
    "coverage": "decoded"
  },
  "2008": {
    "name": "Links",
    "schema": [
      "object",
      [
        "y",
        [
          "array",
          "ev",
          [
            "tuple",
            "ev",
            "ev"
          ]
        ]
      ],
      [
        "x",
        [
          "array",
          "ev",
          [
            "tuple",
            "ev",
            "ev"
          ]
        ]
      ]
    ],
    "coverage": "decoded"
  },
  "2007": {
    "name": "image",
    "schema": "bitmap",
    "coverage": "decoded"
  },
  "2013": {
    "name": "Glyph Bitmaps",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "2023": {
    "name": "VSB",
    "schema": [
      "rest",
      "ev"
    ],
    "coverage": "decoded"
  },
  "2019": {
    "name": "Glyph Sketch",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "2010": {
    "name": "Glyph Hinting Options",
    "schema": "glyph_flags",
    "coverage": "decoded"
  },
  "2009": {
    "name": "mask",
    "schema": "mask",
    "coverage": "decoded"
  },
  "2011": {
    "name": "mask.metrics",
    "schema": [
      "tuple",
      "i16",
      "i16"
    ],
    "coverage": "decoded"
  },
  "2028": {
    "name": "mask.metrics_mm",
    "schema": [
      "rest",
      [
        "tuple",
        "ev",
        "ev"
      ]
    ],
    "coverage": "decoded"
  },
  "2027": {
    "name": "Glyph Origin",
    "schema": [
      "object",
      [
        "x",
        "i16"
      ],
      [
        "y",
        "i16"
      ]
    ],
    "coverage": "decoded"
  },
  "1250": {
    "name": "unicodes",
    "schema": [
      "rest",
      "u16"
    ],
    "coverage": "decoded"
  },
  "2034": {
    "name": "Custom Dict",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1253": {
    "name": "Glyph Unicode Non-BMP",
    "schema": [
      "rest",
      "u32"
    ],
    "coverage": "decoded"
  },
  "2012": {
    "name": "mark",
    "schema": "u16",
    "coverage": "decoded"
  },
  "2015": {
    "name": "glyph.customdata",
    "schema": "text",
    "coverage": "decoded"
  },
  "2017": {
    "name": "glyph.note",
    "schema": "text",
    "coverage": "decoded"
  },
  "2018": {
    "name": "Glyph GDEF Data",
    "schema": "gdef",
    "coverage": "decoded"
  },
  "2020": {
    "name": "Glyph Anchors Supplemental",
    "schema": [
      "array",
      "ev",
      [
        "object",
        [
          "hue",
          "ev"
        ],
        [
          "data",
          "ev"
        ]
      ]
    ],
    "coverage": "decoded"
  },
  "2029": {
    "name": "Glyph Anchors MM",
    "schema": "anchors",
    "coverage": "decoded"
  },
  "2031": {
    "name": "Glyph Guide Properties",
    "schema": "guide_properties",
    "coverage": "decoded"
  },
  "1743": {
    "name": "Font Options",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1744": {
    "name": "Export Options",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1742": {
    "name": "Mapping Mode",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "272": {
    "name": "Block MM Kerning Start",
    "schema": "text",
    "coverage": "decoded"
  },
  "1410": {
    "name": "MMKernPair",
    "schema": [
      "object",
      [
        "left",
        "u32"
      ],
      [
        "right",
        "u32"
      ],
      [
        "values",
        [
          "rest",
          "i16"
        ]
      ]
    ],
    "coverage": "decoded"
  },
  "528": {
    "name": "Block MM Kerning End",
    "schema": "text",
    "coverage": "decoded"
  },
  "5": {
    "name": "Block Font End",
    "schema": "text",
    "coverage": "decoded"
  },
  "2": {
    "name": "Block File Data End",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1231": {
    "name": "1231",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1232": {
    "name": "1232",
    "schema": "text",
    "coverage": "decoded"
  },
  "1235": {
    "name": "1235",
    "schema": "u16",
    "coverage": "decoded"
  },
  "1236": {
    "name": "1236",
    "schema": "raw",
    "coverage": "retained_raw"
  },
  "1237": {
    "name": "1237",
    "schema": [
      "rest",
      "i16"
    ],
    "coverage": "decoded"
  },
  "1248": {
    "name": "1248",
    "schema": [
      "rest",
      [
        "tuple",
        "i16",
        "i16"
      ]
    ],
    "coverage": "decoded"
  },
  "2002": {
    "name": "2002",
    "schema": "nodes",
    "coverage": "decoded"
  },
  "2004": {
    "name": "2004",
    "schema": "guides",
    "coverage": "decoded"
  },
  "2005": {
    "name": "2005",
    "schema": [
      "rest",
      [
        "tuple",
        "ev",
        "ev"
      ]
    ],
    "coverage": "decoded"
  }
}
;
export const tthCommands:Record<string,[string,string[]]> = {
  "1": [
    "AlignTop",
    [
      "pt",
      "zone"
    ]
  ],
  "2": [
    "AlignBottom",
    [
      "pt",
      "zone"
    ]
  ],
  "3": [
    "SingleLinkH",
    [
      "pt1",
      "pt2",
      "stem",
      "align"
    ]
  ],
  "4": [
    "SingleLinkV",
    [
      "pt1",
      "pt2",
      "stem",
      "align"
    ]
  ],
  "5": [
    "DoubleLinkH",
    [
      "pt1",
      "pt2",
      "stem"
    ]
  ],
  "6": [
    "DoubleLinkV",
    [
      "pt1",
      "pt2",
      "stem"
    ]
  ],
  "7": [
    "AlignH",
    [
      "pt",
      "align"
    ]
  ],
  "8": [
    "AlignV",
    [
      "pt",
      "align"
    ]
  ],
  "13": [
    "InterpolateH",
    [
      "pti",
      "pt1",
      "pt2",
      "align"
    ]
  ],
  "14": [
    "InterpolateV",
    [
      "pti",
      "pt1",
      "pt2",
      "align"
    ]
  ],
  "20": [
    "MDeltaH",
    [
      "pt",
      "shift",
      "ppm1",
      "ppm2"
    ]
  ],
  "21": [
    "MDeltaV",
    [
      "pt",
      "shift",
      "ppm1",
      "ppm2"
    ]
  ],
  "22": [
    "FDeltaH",
    [
      "pt",
      "shift",
      "ppm1",
      "ppm2"
    ]
  ],
  "23": [
    "FDeltaV",
    [
      "pt",
      "shift",
      "ppm1",
      "ppm2"
    ]
  ]
}
;
