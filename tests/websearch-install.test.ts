import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Web Search Dependencies', () => {
  it('should have duck-duck-scrape in package.json dependencies', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.dependencies).toHaveProperty('duck-duck-scrape');
    expect(packageJson.dependencies['duck-duck-scrape']).toBe('2.2.7');
  });

  it('should have duck-duck-scrape installed in node_modules', () => {
    const modulePath = path.join(process.cwd(), 'node_modules', 'duck-duck-scrape');
    expect(fs.existsSync(modulePath)).toBe(true);
  });
});
