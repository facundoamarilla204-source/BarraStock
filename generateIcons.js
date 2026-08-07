import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  const svgPath = path.join(__dirname, 'logo.svg');
  const buildDir = path.join(__dirname, 'build');
  const resourcesDir = path.join(__dirname, 'resources');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate build/icon.png (512x512)
  const png512Buffer = await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512Buffer);
  console.log('Generated build/icon.png (512x512)');

  // 2. Generate resources/icon.png (256x256) for window title
  const png256Buffer = await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png256Buffer);
  console.log('Generated resources/icon.png (256x256)');

  // 3. Generate multi-resolution PNGs for ICO
  const sizes = [16, 32, 48, 256];
  const pngBuffers = [];
  for (const size of sizes) {
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buffer);
  }

  // 4. Generate build/icon.ico
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  console.log('Generated build/icon.ico');

  // Also replace build/icon.ico in resources if needed
  fs.copyFileSync(path.join(buildDir, 'icon.ico'), path.join(resourcesDir, 'icon.ico'));
}

generateIcons().catch(console.error);
