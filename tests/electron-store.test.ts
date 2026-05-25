import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('electron-store installation', () => {
  it('should have electron-store package in dependencies', () => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJson.dependencies).toHaveProperty('electron-store');
    expect(packageJson.dependencies['electron-store']).toBe('^11.0.2');
  });

  it('should be able to require electron-store module', () => {
    // Verify the module exists in node_modules
    expect(() => require.resolve('electron-store')).not.toThrow();
  });
});
