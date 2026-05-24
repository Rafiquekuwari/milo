/**
 * Run this once to generate all PWA icons:
 *   cd public/icons && node generate-icons.js
 *
 * Requires: npm install -g sharp  (or: npm install sharp in project root)
 * 
 * If you don't want to install sharp, use the online tool instead:
 *   https://maskable.app/editor  — upload milo-happy.png, download all sizes
 */

const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// Source: use the highest-res Milo asset you have
// Update this path to point to your actual milo asset
const SOURCE = path.join(__dirname, '../assets/characters/milo-happy.png')

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`)
    console.error('Update SOURCE path to point to your highest-res Milo image')
    process.exit(1)
  }

  for (const size of SIZES) {
    const output = path.join(__dirname, `icon-${size}.png`)
    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 252, g: 234, b: 182, alpha: 1 }, // #FCEAB6 - Milo's warm bg
      })
      .png()
      .toFile(output)
    console.log(`✅ icon-${size}.png`)
  }
  console.log('\nAll icons generated! You can delete generate-icons.js now.')
}

generate().catch(console.error)
