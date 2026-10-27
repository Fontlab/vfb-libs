#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {read,toVfbLibJson} from './dist/reader.js';
try {if(process.argv.length!==3)throw new Error('Usage: vfb-json FILE.vfb');console.log(JSON.stringify(toVfbLibJson(read(await readFile(process.argv[2]))),null,2));}
catch(error){console.error(String(error));process.exitCode=1;}
