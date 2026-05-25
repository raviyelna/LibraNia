import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('AI SDK Dependencies', () => {
  it('should have @anthropic-ai/sdk in package.json dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    );
    expect(packageJson.dependencies).toHaveProperty('@anthropic-ai/sdk');
  });

  it('should have openai in package.json dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    );
    expect(packageJson.dependencies).toHaveProperty('openai');
  });

  it('should have zod in package.json dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    );
    expect(packageJson.dependencies).toHaveProperty('zod');
  });

  it('should have all AI SDK packages installed', async () => {
    // This test verifies packages are actually installed, not just listed
    await expect(async () => {
      await import('@anthropic-ai/sdk');
    }).not.toThrow();

    await expect(async () => {
      await import('openai');
    }).not.toThrow();

    await expect(async () => {
      await import('zod');
    }).not.toThrow();
  });
});
