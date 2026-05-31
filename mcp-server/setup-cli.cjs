#!/usr/bin/env node

/**
 * Auto-setup LibraNia MCP server for Claude Code CLI.
 *
 * Usage:
 *   node setup-cli.cjs           # Local to this LibraNia repository
 *   node setup-cli.cjs --global  # User scope, available in all projects
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const isGlobal = process.argv.includes('--global');
const scope = isGlobal ? 'user' : 'local';
const PROJECT_ROOT = path.join(__dirname, '..');
const MCP_SERVER_PATH = path.join(__dirname, 'dist', 'index.js');
const DATA_DIR = process.env.LIBRANIA_DATA_DIR || path.join(PROJECT_ROOT, 'data');
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
    cwd: options.cwd || PROJECT_ROOT,
    stdio: options.stdio || 'inherit',
    shell: options.shell ?? process.platform === 'win32',
  });
}

function main() {
  log('LibraNia MCP Server Setup for Claude Code CLI');
  log(`Scope: ${scope.toUpperCase()}`);
  log('==============================================\n');

  if (!fs.existsSync(MCP_SERVER_PATH)) {
    log('Building MCP server...');
    const build = run('npm', ['run', 'build'], { cwd: __dirname });
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

  // Ignore removal failures: the registration may not exist yet.
  run('claude', ['mcp', 'remove', 'librania', '-s', scope], {
    stdio: 'ignore',
    shell: false,
  });

  const serverConfig = JSON.stringify({
    type: 'stdio',
    command: 'node',
    args: [MCP_SERVER_PATH],
    env: {
      LIBRANIA_DATA_DIR: DATA_DIR,
    },
  });

  log('Registering LibraNia with Claude Code...');
  const add = run('claude', ['mcp', 'add-json', 'librania', serverConfig, '-s', scope], {
    shell: false,
  });

  if (add.error && add.error.code === 'ENOENT') {
    error('Claude Code CLI not found. Install Claude Code and ensure "claude" is on PATH.');
  }
  if (add.status !== 0) {
    error('Failed to register LibraNia with Claude Code.');
  }

  log('\nSetup complete.');
  log('Restart Claude Code, then ask: "Search my LibraNia notes about [topic]"');
  log(`MCP server: ${MCP_SERVER_PATH}`);
  log(`Data directory: ${DATA_DIR}`);
}

main();
