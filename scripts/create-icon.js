// Simple script to create a placeholder icon
// This creates a base64-encoded PNG that can be used as a tray icon
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple 256x256 PNG with indigo background and white "L"
// Using a data URL approach for simplicity
const canvas = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#6366f1" rx="32"/>
  <text x="128" y="180" font-family="Arial, sans-serif" font-size="160" font-weight="bold" fill="white" text-anchor="middle">L</text>
</svg>
`;

const resourcesDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

fs.writeFileSync(path.join(resourcesDir, 'icon.svg'), canvas.trim());
console.log('Icon created at resources/icon.svg');
