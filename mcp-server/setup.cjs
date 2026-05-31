#!/usr/bin/env node

/**
 * Auto-setup LibraNia MCP server for Claude Desktop
 *
 * Usage: node setup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLAUDE_CONFIG_PATH = path.join(
  process.env.APPDATA,
  'Claude',
  'claude_desktop_config.json'
);

const MCP_SERVER_PATH = path.join(__dirname, 'dist', 'index.js');
const DATA_DIR = process.env.LIBRANIA_DATA_DIR || path.join(__dirname, '..', 'data');

function log(msg) {
  console.log(`[Setup] ${msg}`);
}

function error(msg) {
  console.error(`[Error] ${msg}`);
  process.exit(1);
}

function main() {
  log('LibraNia MCP Server Setup');
  log('=========================\n');

  // Step 1: Check if built
  if (!fs.existsSync(MCP_SERVER_PATH)) {
    log('Building MCP server...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      log('✓ Build complete\n');
    } catch (err) {
      error('Build failed. Run "npm install" first.');
    }
  } else {
    log('✓ MCP server already built\n');
  }

  // Step 2: Check Claude Desktop config
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) {
    error(`Claude Desktop config not found at:\n${CLAUDE_CONFIG_PATH}\n\nInstall Claude Desktop first.`);
  }

  log('Found Claude Desktop config\n');

  // Step 3: Read existing config
  let config;
  try {
    const content = fs.readFileSync(CLAUDE_CONFIG_PATH, 'utf-8');
    config = JSON.parse(content);
  } catch (err) {
    error(`Failed to parse config: ${err.message}`);
  }

  // Step 4: Add LibraNia MCP server
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const serverConfig = {
    command: 'node',
    args: [MCP_SERVER_PATH],
    env: {
      LIBRANIA_DATA_DIR: DATA_DIR
    }
  };

  if (config.mcpServers.librania) {
    log('LibraNia MCP server already configured');
    log('Updating configuration...\n');
  } else {
    log('Adding LibraNia MCP server...\n');
  }

  config.mcpServers.librania = serverConfig;

  // Step 5: Write config
  try {
    fs.writeFileSync(
      CLAUDE_CONFIG_PATH,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
    log('✓ Configuration updated\n');
  } catch (err) {
    error(`Failed to write config: ${err.message}`);
  }

  // Step 6: Done
  log('Setup Complete!');
  log('==============\n');
  log('Next steps:');
  log('1. Restart Claude Desktop');
  log('2. Test: "Search my LibraNia notes about [topic]"');
  log('3. Claude will use your knowledge base automatically\n');
  log('Config location:');
  log(CLAUDE_CONFIG_PATH);
  log('\nMCP server location:');
  log(MCP_SERVER_PATH);
}

main();
