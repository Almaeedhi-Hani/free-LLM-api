'use strict';
const fs=require('node:fs');
const path=require('node:path');
function readGlobalStyles(){
  const manifest='src/app/globals.css';
  const source=fs.readFileSync(manifest,'utf8');
  const imports=[...source.matchAll(/^@import "(\.\.\/styles\/[^"]+\.css)";$/gm)];
  if(!imports.length)throw Error('Global style manifest has no imports');
  return imports.map(m=>fs.readFileSync(path.resolve(path.dirname(manifest),m[1]),'utf8')).join('');
}
module.exports={readGlobalStyles};
