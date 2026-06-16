import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const svgPath = join(process.cwd(), 'public/favicon.svg');
const outputDir = join(process.cwd(), 'public');

const sizes = [180, 192, 512];

async function generateIcons() {
  const svgBuffer = readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }
  
  // Also generate apple-touch-icon (180x180)
  const appleTouchIconPath = join(outputDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);
  console.log(`Generated: ${appleTouchIconPath}`);
}

generateIcons().catch(console.error);
