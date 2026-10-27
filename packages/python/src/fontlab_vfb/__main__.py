"""Print compatible JSON to stdout; diagnostics go to stderr."""

import json
import sys
from . import read, to_vfblib_json


def main():
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: vfb-json FILE.vfb")
        result = to_vfblib_json(read(sys.argv[1]))
        print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
