const fs = require('fs');
const path = require('path');

const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.log('[patch-opennext] handler.mjs not found, skipping patch.');
  process.exit(0);
}

let code = fs.readFileSync(handlerPath, 'utf8');

// Fix 1: equals-negative-zero
code = code.replace(/([a-zA-Z0-9_$]+)\s*===\s*-0/g, (match, variable) => {
  return `Object.is(${variable}, -0)`;
});

// Fix 2: duplicate-object-key for floating-ui options
code = code.replace(/options:(f2=e2=|j2=i2=|l2=k2=|n2=m2=|p2=o2=|r2=q2=)/g, '_options:$1');

fs.writeFileSync(handlerPath, code, 'utf8');
console.log('[patch-opennext] Cleaned up esbuild warnings in handler.mjs successfully!');

