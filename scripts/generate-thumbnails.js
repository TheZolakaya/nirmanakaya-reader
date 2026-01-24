#!/usr/bin/env node
/**
 * Generate thumbnails for map card images
 * Reduces ~350MB of images to ~5MB for fast map loading
 *
 * Usage: node scripts/generate-thumbnails.js
 */

const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const MAP_DIR = path.join(__dirname, '../public/map');
const THUMB_WIDTH = 200;  // px - enough for 120px display with 2x retina
const QUALITY = 75;       // JPEG quality

// Directories to process
const DIRS = ['archetypes', 'bounds/wands', 'bounds/swords', 'bounds/cups', 'bounds/pentacles', 'agents'];

async function generateThumbnails() {
  console.log('🖼️  Generating thumbnails for map images...\n');

  let totalOriginal = 0;
  let totalThumb = 0;
  let count = 0;
  let errors = [];

  for (const dir of DIRS) {
    const srcDir = path.join(MAP_DIR, dir);
    const thumbDir = path.join(MAP_DIR, 'thumbs', dir);

    // Create thumb directory
    fs.mkdirSync(thumbDir, { recursive: true });

    // Get all PNG files
    let files;
    try {
      files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png'));
    } catch (e) {
      console.log(`⚠️  Skipping ${dir}: ${e.message}`);
      continue;
    }

    console.log(`📁 ${dir}: ${files.length} images`);

    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      // Keep as PNG for transparency, but compressed
      const thumbPath = path.join(thumbDir, file);

      try {
        const srcStats = fs.statSync(srcPath);
        totalOriginal += srcStats.size;

        // Load and resize
        const image = await Jimp.read(srcPath);

        // Calculate new height to maintain aspect ratio
        const ratio = THUMB_WIDTH / image.getWidth();
        const newHeight = Math.round(image.getHeight() * ratio);

        await image
          .resize(THUMB_WIDTH, newHeight)
          .quality(QUALITY)
          .writeAsync(thumbPath);

        const thumbStats = fs.statSync(thumbPath);
        totalThumb += thumbStats.size;
        count++;

        process.stdout.write('.');
      } catch (err) {
        errors.push({ file: srcPath, error: err.message });
        process.stdout.write('X');
      }
    }
    console.log('');
  }

  console.log('\n✅ Done!\n');
  console.log(`   Files processed: ${count}`);
  console.log(`   Original total:  ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Thumbnail total: ${(totalThumb / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Reduction:       ${((1 - totalThumb / totalOriginal) * 100).toFixed(0)}%`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors (${errors.length}):`);
    errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
  }
}

generateThumbnails().catch(console.error);
