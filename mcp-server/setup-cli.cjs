#!/usr/bin/env node

/**
 * Auto-setup LibraNia MCP server for Claude Code CLI
 *
 * Usage:
 *   node setup-cli.cjs           # Project-specific (current directory)
 *   node setup-cli.cjs --global  # Global (all projects)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const isGlobal = process.argv.includes('--global');
const CLAUDE_CODE_CONFIG_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');
const MCP_SERVER_PATH = path.join(__dirname, 'dist', 'index.js');

function log(msg) {
  console.log(`[Setup] ${msg}`);
}

function error(msg) {
  console.error(`[Error] ${msg}`);
  process.exit(1);
}

function getCurrentProjectPath() {
  const cwd = process.cwd();
  // Normalize to forward slashes for .claude.json keys
  return cwd.replace(/\\/g, '/');
}

function main() {
  log(`LibraNia MCP Server Setup for Claude Code CLI`);
  log(`Mode: ${isGlobal ? 'GLOBAL (all projects)' : 'PROJECT (current directory only)'}`);
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

  if (isGlobal) {
    setupGlobal();
  } else {
    setupProject();
  }
}

function setupGlobal() {
  // Add to settings.json (global registry)
  const claudeDir = path.dirname(CLAUDE_CODE_CONFIG_PATH);
  if (!fs.existsSync(claudeDir)) {
    log('Creating .claude directory...');
    fs.mkdirSync(claudeDir, { recursive: true });
  }

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

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const serverConfig = {
    command: 'node',
    args: [MCP_SERVER_PATH]
  };

  if (config.mcpServers.librania) {
    log('LibraNia MCP server already in global registry');
    log('Updating configuration...\n');
  } else {
    log('Adding LibraNia MCP server to global registry...\n');
  }

  config.mcpServers.librania = serverConfig;

  try {
    fs.writeFileSync(
      CLAUDE_CODE_CONFIG_PATH,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
    log('✓ Global registry updated\n');
  } catch (err) {
    error(`Failed to write config: ${err.message}`);
  }

  log('Setup Complete (GLOBAL)!');
  log('========================\n');
  log('LibraNia MCP registered globally in settings.json');
  log('Still need to enable per-project:\n');
  log('1. cd <your-project>');
  log('2. claude');
  log('3. /mcp → enable librania');
  log('4. Test: "Search my LibraNia notes about [topic]"\n');
  log('Config location:');
  log(CLAUDE_CODE_CONFIG_PATH);
  log('\nMCP server location:');
  log(MCP_SERVER_PATH);
  log('\nNote: Global = available everywhere, but enable per-project via /mcp\n');
}

function setupProject() {
  // Add directly to .claude.json for current project
  if (!fs.existsSync(CLAUDE_JSON_PATH)) {
    error(`.claude.json not found. Run Claude Code at least once first.`);
  }

  let claudeJson;
  try {
    const content = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
    claudeJson = JSON.parse(content);
  } catch (err) {
    error(`Failed to parse .claude.json: ${err.message}`);
  }

  const projectPath = getCurrentProjectPath();
  log(`Current project: ${projectPath}\n`);

  if (!claudeJson.projects) {
    claudeJson.projects = {};
  }

  if (!claudeJson.projects[projectPath]) {
    log('Project not in .claude.json yet. Creating entry...\n');
    claudeJson.projects[projectPath] = {
      allowedTools: [],
      mcpContextUris: [],
      mcpServers: {},
      enabledMcpjsonServers: [],
      disabledMcpjsonServers: [],
      hasTrustDialogAccepted: false,
      projectOnboardingSeenCount: 0,
      hasClaudeMdExternalIncludesApproved: false,
      hasClaudeMdExternalIncludesWarningShown: false
    };
  }

  if (!claudeJson.projects[projectPath].mcpServers) {
    claudeJson.projects[projectPath].mcpServers = {};
  }

  const serverConfig = {
    command: 'node',
    args: [MCP_SERVER_PATH]
  };

  if (claudeJson.projects[projectPath].mcpServers.librania) {
    log('LibraNia MCP already configured for this project');
    log('Updating configuration...\n');
  } else {
    log('Adding LibraNia MCP to this project...\n');
  }

  claudeJson.projects[projectPath].mcpServers.librania = serverConfig;

  try {
    fs.writeFileSync(
      CLAUDE_JSON_PATH,
      JSON.stringify(claudeJson, null, 2),
      'utf-8'
    );
    log('✓ Project configuration updated\n');
  } catch (err) {
    error(`Failed to write .claude.json: ${err.message}`);
  }

  log('Setup Complete (PROJECT)!');
  log('=========================\n');
  log('Next steps:');
  log('1. Restart Claude Code CLI (exit and run: claude)');
  log('2. LibraNia MCP will auto-connect');
  log('3. Test: "Search my LibraNia notes about [topic]"\n');
  log('Config location:');
  log(CLAUDE_JSON_PATH);
  log(`Project: ${projectPath}`);
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
