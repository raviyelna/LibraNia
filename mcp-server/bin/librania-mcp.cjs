#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');

const mcpRoot = path.join(__dirname, '..');
const nodeModulesPath = path.join(mcpRoot, 'node_modules');
const serverPath = path.join(mcpRoot, 'dist', 'index.js');

function log(message) {
  console.error(`[LibraNia MCP] ${message}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: mcpRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.stdout) {
    process.stderr.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

async function checkNativeDependencies() {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');
  db.prepare('select 1 as ok').get();
  db.close();
}

function repairDependencies() {
  if (!fs.existsSync(nodeModulesPath)) {
    log('Dependencies missing; installing for this OS...');
    return run('npm', ['install']).status === 0;
  }

  log('Native dependency is not usable on this OS; rebuilding...');
  const rebuild = run('npm', ['rebuild', 'better-sqlite3']);
  if (rebuild.status === 0) {
    return true;
  }

  log('Rebuild failed; reinstalling MCP dependencies for this OS...');
  try {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  } catch (error) {
    log(`Failed to remove node_modules: ${error.message}`);
    return false;
  }

  return run('npm', ['install']).status === 0;
}

async function main() {
  if (!fs.existsSync(serverPath)) {
    log(`Built server not found: ${serverPath}`);
    log('Run "npm run build" in mcp-server first.');
    process.exit(1);
  }

  try {
    await checkNativeDependencies();
  } catch (firstError) {
    log(firstError.message || String(firstError));
    if (!repairDependencies()) {
      process.exit(1);
    }

    try {
      await checkNativeDependencies();
    } catch (secondError) {
      log(`Native dependency check still failed: ${secondError.message || String(secondError)}`);
      process.exit(1);
    }
  }

  await import(pathToFileURL(serverPath).href);
}

main().catch((error) => {
  log(error.stack || error.message || String(error));
  process.exit(1);
});
