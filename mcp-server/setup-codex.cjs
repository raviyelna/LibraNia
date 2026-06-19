#!/usr/bin/env node

/**
 * Auto-setup LibraNia MCP server for Codex CLI.
 *
 * Usage: node setup-codex.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MCP_SERVER_PATH = path.join(__dirname, 'dist', 'index.js');
const MCP_LAUNCHER_PATH = path.join(__dirname, 'bin', 'librania-mcp.cjs');
const DATA_DIR = process.env.LIBRANIA_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'librania.db');

function log(msg) {
  console.log(`[Setup] ${msg}`);
}

function error(msg) {
  console.error(`[Error] ${msg}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio || 'inherit',
    shell: process.platform === 'win32',
  });
}

function main() {
  log('LibraNia MCP Server Setup for Codex CLI');
  log('========================================\n');

  if (!fs.existsSync(MCP_SERVER_PATH)) {
    log('Building MCP server...');
    const build = run('npm', ['run', 'build']);
    if (build.status !== 0) {
      error('Build failed. Run "npm install" first.');
    }
    log('Build complete\n');
  } else {
    log('MCP server already built\n');
  }

  if (!fs.existsSync(DB_PATH)) {
    error(`LibraNia database not found at:\n${DB_PATH}`);
  }

  const existing = run('codex', ['mcp', 'get', 'librania'], { stdio: 'ignore' });
  if (existing.status === 0) {
    log('Replacing existing Codex MCP registration...');
    const remove = run('codex', ['mcp', 'remove', 'librania']);
    if (remove.status !== 0) {
      error('Failed to remove the existing Codex MCP registration.');
    }
  }

  log('Registering LibraNia with Codex...');
  const add = run('codex', [
    'mcp',
    'add',
    'librania',
    '--env',
    `LIBRANIA_DATA_DIR=${DATA_DIR}`,
    '--',
    'node',
    MCP_LAUNCHER_PATH,
  ]);

  if (add.error && add.error.code === 'ENOENT') {
    error('Codex CLI not found. Install Codex and ensure "codex" is on PATH.');
  }
  if (add.status !== 0) {
    error('Failed to register LibraNia with Codex.');
  }

  log('\nSetup complete.');
  log('Restart Codex, then ask: "Search my LibraNia notes about [topic]"');
  log('Research policy is in AGENTS.md: search LibraNia first, then write useful web findings back before answering.');
  log(`MCP launcher: ${MCP_LAUNCHER_PATH}`);
  log(`MCP server: ${MCP_SERVER_PATH}`);
  log(`Data directory: ${DATA_DIR}`);
}

main();
