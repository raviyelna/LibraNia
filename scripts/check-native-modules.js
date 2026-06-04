import process from 'process';

const nativeModules = ['better-sqlite3', 'sharp'];
const failures = [];

for (const moduleName of nativeModules) {
  try {
    await import(moduleName);
  } catch (error) {
    failures.push({ moduleName, message: error.message || String(error) });
  }
}

if (failures.length === 0) {
  process.exit(0);
}

const cwd = process.cwd();
const isWslMountedDrive = process.platform === 'linux' && cwd.startsWith('/mnt/');
const invalidBinary = failures.some(({ message }) =>
  message.includes('invalid ELF header') ||
  message.includes('not a valid Win32 application')
);

console.error('Native Node modules are not usable in this environment.\n');
for (const failure of failures) {
  console.error(`- ${failure.moduleName}: ${failure.message}`);
}

if (isWslMountedDrive && invalidBinary) {
  console.error(`
This repository is running from a Windows-mounted WSL path (${cwd}).
The current node_modules directory contains native binaries built for another operating system.

Recommended fix: keep a separate Linux checkout under your WSL home directory:
  cd ~
  cp -a "${cwd}" ./LibraNia
  cd ~/LibraNia
  rm -rf node_modules
  npm install
  bash start.sh

If you intentionally want to keep the checkout under /mnt, stop all Windows LibraNia Node processes first, then run:
  rm -rf node_modules
  npm install
  bash start.sh

Do not share one node_modules directory between Windows Node.js and WSL Node.js.`);
} else {
  console.error(`
Install local dependencies for this operating system:
  rm -rf node_modules
  npm install

If compilation is required on Linux, install build tools first:
  sudo apt install build-essential python3

This is a local project. Do not run "npm install -g librania".`);
}

process.exit(1);
