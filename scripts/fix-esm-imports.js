import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const hasRuntimeExtension = (specifier) => /\.(?:[cm]?js|json|node)$/i.test(specifier);

function fixFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const fixed = source.replace(
    /(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      return hasRuntimeExtension(specifier)
        ? match
        : `${prefix}${quote}${specifier}.js${quote}`;
    }
  );

  if (fixed !== source) {
    fs.writeFileSync(filePath, fixed);
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && path.extname(entry.name) === '.js') {
      fixFile(fullPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  walk(distDir);
}

console.log('Fixed ESM imports in dist/');
