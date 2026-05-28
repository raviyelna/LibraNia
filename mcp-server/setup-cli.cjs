#!/usr/bin/env node

/**
 * Auto-setup LibraNia MCP server for Claude Code CLI
 *
 * Usage: node setup-cli.cjs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CLAUDE_CODE_CONFIG_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const MCP_SERVER_PATH = path.join(__dirname, 'dist', 'index.js');

function log(msg) {
  console.log(`[Setup] ${msg}`);
}

function error(msg) {
  console.error(`[Error] ${msg}`);
  process.exit(1);
}

function main() {
  log('LibraNia MCP Server Setup for Claude Code CLI');
  log('===============================================\n');

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

  // Step 2: Check Claude Code config directory
  const claudeDir = path.dirname(CLAUDE_CODE_CONFIG_PATH);
  if (!fs.existsSync(claudeDir)) {
    log('Creating .claude directory...');
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Step 3: Read or create config
  let config = {};
  if (fs.existsSync(CLAUDE_CODE_CONFIG_PATH)) {
    log('Found Claude Code config\n');
    try {
      const content = fs.readFileSync(CLAUDE_CODE_CONFIG_PATH, 'utf-8');
      config = JSON.parse(content);
    } catch (err) {
      error(`Failed to parse config: ${err.message}`);
    }
  } else {
    log('Creating new Claude Code config\n');
  }

  // Step 4: Add LibraNia MCP server
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const serverConfig = {
    command: 'node',
    args: [MCP_SERVER_PATH]
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
      CLAUDE_CODE_CONFIG_PATH,
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
  log('1. Restart Claude Code CLI (if running)');
  log('2. Test: claude');
  log('   Then: "Search my LibraNia notes about [topic]"');
  log('3. Claude Code will use your knowledge base automatically\n');
  log('Config location:');
  log(CLAUDE_CODE_CONFIG_PATH);
  log('\nMCP server location:');
  log(MCP_SERVER_PATH);
  log('\nAvailable tools:');
  log('- search_notes: Search knowledge base');
  log('- get_note: Get full note content');
  log('- create_note: Save new findings');
  log('- update_note: Append to existing note');
  log('- add_tags: Categorize notes');
  log('- list_tags: Browse all tags\n');
}

main();
