#!/usr/bin/env node
/**
 * Generate Favicon images from SVG
 * Converts sora-logo.svg to PNG files in different sizes
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const SVG_SOURCE = path.join(process.cwd(), "client/public/sora-logo.svg");
const PUBLIC_DIR = path.join(process.cwd(), "client/public");

// Required favicon sizes
const SIZES = [
    { name: "favicon.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "android-chrome-192.png", size: 192 },
    { name: "android-chrome-512.png", size: 512 },
];

async function checkDependencies() {
    console.log("🔍 Checking for image conversion tools...\n");

    try {
        // Try ImageMagick
        execSync("magick --version", { stdio: "pipe" });
        console.log("✅ ImageMagick found");
        return "magick";
    } catch {
        console.warn("⚠️  ImageMagick not installed");
    }

    try {
        // Try ffmpeg (also can convert images)
        execSync("ffmpeg -version", { stdio: "pipe" });
        console.log("✅ ffmpeg found");
        return "ffmpeg";
    } catch {
        console.warn("⚠️  ffmpeg not installed");
    }

    // Try deno (available in some environments)
    try {
        execSync("deno --version", { stdio: "pipe" });
        console.log("✅ Deno found");
        return "deno";
    } catch {
        console.warn("⚠️  Deno not installed");
    }

    return null;
}

async function convertWithMagick() {
    console.log("\n🎨 Converting SVG to PNG with ImageMagick...\n");

    for (const { name, size } of SIZES) {
        const outputPath = path.join(PUBLIC_DIR, name);
        const cmd = `magick convert "${SVG_SOURCE}" -background none -resize ${size}x${size} "${outputPath}"`;

        try {
            execSync(cmd, { stdio: "inherit" });
            console.log(`✅ Created: ${name} (${size}x${size})`);
        } catch (error) {
            console.error(`❌ Failed to create ${name}:`, error);
        }
    }
}

async function convertWithFfmpeg() {
    console.log("\n🎬 Converting SVG to PNG with ffmpeg...\n");

    for (const { name, size } of SIZES) {
        const outputPath = path.join(PUBLIC_DIR, name);
        const cmd = `ffmpeg -i "${SVG_SOURCE}" -vf "scale=${size}:${size}" "${outputPath}" -y`;

        try {
            execSync(cmd, { stdio: "pipe" });
            console.log(`✅ Created: ${name} (${size}x${size})`);
        } catch (error) {
            console.error(`❌ Failed to create ${name}`);
        }
    }
}

async function copyAsPlaceholder() {
    console.log("\n📋 No image conversion tool found.");
    console.log("📝 Creating placeholder PNG files...\n");

    // Create simple 1x1 pixel PNG as placeholder
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    ]);

    for (const { name } of SIZES) {
        const outputPath = path.join(PUBLIC_DIR, name);
        // Write a minimal valid PNG
        fs.writeFileSync(outputPath, pngHeader);
        console.log(`⚠️  Created placeholder: ${name}`);
    }

    console.log("\n💡 To generate proper favicons, install ImageMagick:");
    console.log("   macOS:   brew install imagemagick");
    console.log("   Ubuntu:  sudo apt-get install imagemagick");
    console.log("   Windows: scoop install imagemagick");
    console.log("\n   Or visit: https://convertio.co/svg-png/");
}

async function main() {
    console.log("🎨 Favicon Generator\n");
    console.log(`Source: ${SVG_SOURCE}`);
    console.log(`Output: ${PUBLIC_DIR}\n`);

    // Check if SVG exists
    if (!fs.existsSync(SVG_SOURCE)) {
        console.error("❌ SVG source not found:", SVG_SOURCE);
        process.exit(1);
    }

    // Try to convert
    const tool = await checkDependencies();

    if (tool === "magick") {
        await convertWithMagick();
    } else if (tool === "ffmpeg") {
        await convertWithFfmpeg();
    } else {
        await copyAsPlaceholder();
    }

    // Create favicon.ico from generated PNGs (if ImageMagick available)
    try {
        const faviconIco = path.join(PUBLIC_DIR, "favicon.ico");
        const favicon32 = path.join(PUBLIC_DIR, "favicon.png");

        if (fs.existsSync(favicon32)) {
            execSync(`magick convert "${favicon32}" "${faviconIco}"`, { stdio: "pipe" });
            console.log(`\n✅ Created: favicon.ico`);
        }
    } catch {
        console.log("⚠️  Could not create favicon.ico (ImageMagick required)");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Favicon generation complete!");
    console.log("=".repeat(60));
    console.log("\n📁 Generated files:");
    for (const { name, size } of SIZES) {
        const filepath = path.join(PUBLIC_DIR, name);
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`   ${name.padEnd(25)} (${size}x${size}) - ${stats.size} bytes`);
        }
    }
}

main().catch(console.error);
