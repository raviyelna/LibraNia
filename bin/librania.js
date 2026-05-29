#!/usr/bin/env node
/**
 * LibraNia CLI Entry Point
 *
 * Launches the LibraNia server with configurable options.
 * Usage: librania start [options]
 */

import { Command } from 'commander';
import { startServer } from '../electron/server.js';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('librania')
  .description('LibraNia - AI-Powered Knowledge Management System')
  .version(packageJson.version);

program
  .command('start')
  .description('Start the LibraNia server')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-d, --data-dir <path>', 'Data directory path', './data')
  .option('--no-browser', 'Do not open browser automatically')
  .action(async (options) => {
    try {
      // Parse and validate port
      const port = parseInt(options.port, 10);
      if (isNaN(port) || port < 1024 || port > 65535) {
        console.error(`Error: Port must be a number between 1024 and 65535 (got: ${options.port})`);
        process.exit(1);
      }

      // Validate and resolve data directory
      const dataDir = path.resolve(options.dataDir);

      // Check if path is absolute and outside user home (security check)
      if (path.isAbsolute(options.dataDir)) {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        if (homeDir && !dataDir.startsWith(homeDir) && !dataDir.startsWith(process.cwd())) {
          console.error(`Error: Absolute paths outside user home are not allowed for security reasons`);
          console.error(`  Provided: ${dataDir}`);
          console.error(`  Use a relative path or a path within your home directory`);
          process.exit(1);
        }
      }

      // Create data directory if it doesn't exist
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
          console.log(`Created data directory: ${dataDir}`);
        }

        // Create subdirectories
        const dataSubDir = path.join(dataDir, 'data');
        const configSubDir = path.join(dataDir, 'config');

        if (!fs.existsSync(dataSubDir)) {
          fs.mkdirSync(dataSubDir, { recursive: true });
        }
        if (!fs.existsSync(configSubDir)) {
          fs.mkdirSync(configSubDir, { recursive: true });
        }
      } catch (error) {
        console.error(`Error: Could not create data directory: ${error.message}`);
        process.exit(1);
      }

      // Set environment variables (precedence: flag > env var > default)
      process.env.LIBRANIA_PORT = port.toString();
      process.env.LIBRANIA_DATA_DIR = dataDir;

      // Resolve dist path relative to bin directory
      const distPath = path.join(__dirname, '../dist');

      console.log('Starting LibraNia server...');
      console.log(`  Port: ${port}`);
      console.log(`  Data directory: ${dataDir}`);
      console.log(`  Frontend: ${distPath}`);
      console.log('');

      // Start the server
      const instance = await startServer(port, distPath);

      const serverUrl = `http://localhost:${instance.port}`;
      console.log(`\nLibraNia server running at ${serverUrl}`);

      if (instance.port !== port) {
        console.log(`  (Port ${port} was in use, using ${instance.port} instead)`);
      }

      console.log('Press Ctrl+C to stop\n');

      // Open browser automatically unless --no-browser flag is used
      if (options.browser) {
        try {
          await open(serverUrl);
        } catch (error) {
          console.warn(`Warning: Could not open browser automatically: ${error.message}`);
          console.warn(`Please open ${serverUrl} manually in your browser.\n`);
        }
      } else {
        console.log('Server running in headless mode (--no-browser flag used)\n');
      }

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log('\nShutting down gracefully...');

        // Set 5-second timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn('Warning: Shutdown timeout exceeded (5s), forcing exit');
          process.exit(1);
        }, 5000);

        try {
          const { stopServer } = await import('../electron/server.js');
          await stopServer(instance);
          clearTimeout(timeoutId);
          console.log('Server stopped gracefully');
          process.exit(0);
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error during shutdown:', error.message);
          process.exit(1);
        }
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
