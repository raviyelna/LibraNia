#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo "Building..."
npm run build:package

echo "Fixing ESM imports..."
node <<'NODE'
const fs = require('fs');
const path = require('path');

function fixImports(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      fixImports(fullPath);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== '.js') {
      continue;
    }

    const source = fs.readFileSync(fullPath, 'utf8');
    const fixed = source.replace(
      /from\s+(['"])(\.{1,2}\/[^'"]+)\1\s*;/g,
      (match, quote, specifier) => {
        return `from ${quote}${specifier.endsWith('.js') ? specifier : `${specifier}.js`}${quote};`;
      }
    );

    if (fixed !== source) {
      fs.writeFileSync(fullPath, fixed);
    }
  }
}

fixImports('dist');
console.log('Fixed ESM imports in dist/');
NODE

echo "Starting LibraNia server..."
node bin/librania.js start --port 3001
