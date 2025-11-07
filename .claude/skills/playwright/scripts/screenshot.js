#!/usr/bin/env node

/**
 * Playwright Screenshot Script
 *
 * By default, takes BOTH desktop and mobile screenshots for efficiency.
 * Use --single flag for single screenshot mode.
 *
 * Usage:
 *   node screenshot.js <url> [options]
 *
 * Default behavior (multi-screenshot):
 *   Takes desktop (1280x720) and mobile (iPhone 13) screenshots
 *   Saves as: {prefix}-desktop.png and {prefix}-mobile.png
 *
 * Options:
 *   --prefix <name>      Filename prefix (default: screenshot)
 *   --output-dir <path>  Output directory (default: project-root/screenshots)
 *   --fullPage           Capture full page screenshot
 *   --tablet             Also include tablet (iPad Pro)
 *   --single             Single screenshot mode (use with --device or --width/height)
 *   --device <name>      Device preset for single mode (e.g., "iPhone 13")
 *   --width <px>         Viewport width for single mode
 *   --height <px>        Viewport height for single mode
 *   --timeout <ms>       Wait timeout (default: 30000)
 *   --wait <selector>    Wait for selector before screenshot
 */

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

/**
 * Check if a URL is accessible
 */
async function checkUrlAccessible(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'HEAD',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Auto-detect best URL for Vif project
 */
async function autoDetectVifUrl() {
  const localhost = 'http://localhost:3000';
  const production = 'https://vif.mpeters.dev';

  console.log('🔍 Checking for local development server...');
  const isLocalRunning = await checkUrlAccessible(localhost);

  if (isLocalRunning) {
    console.log('✅ Found local server at localhost:3000\n');
    return localhost;
  } else {
    console.log('⚠️  Local server not running, using production URL\n');
    return production;
  }
}

async function takeScreenshot() {
  const args = process.argv.slice(2);

  if (args[0] === '--help') {
    console.log(`
Playwright Screenshot Tool

Default: Takes desktop + mobile screenshots together (FAST!)

Usage:
  node screenshot.js [url] [options]

  If no URL is provided, automatically checks localhost:3000 or falls back to vif.mpeters.dev

Options:
  --prefix <name>      Filename prefix (default: screenshot)
  --output-dir <path>  Output directory (default: project-root/screenshots)
  --fullPage           Capture full page screenshot
  --tablet             Also include tablet (iPad Pro)
  --single             Single screenshot mode
  --device <name>      Device preset for single mode
  --width <px>         Viewport width for single mode
  --height <px>        Viewport height for single mode
  --timeout <ms>       Wait timeout (default: 30000)
  --wait <selector>    Wait for CSS selector before screenshot

Examples:
  # Auto-detect Vif URL (localhost:3000 or vif.mpeters.dev)
  node screenshot.js

  # Default: Desktop + Mobile
  node screenshot.js http://localhost:3000

  # With custom prefix
  node screenshot.js https://vif.mpeters.dev --prefix vif --fullPage

  # Include tablet too
  node screenshot.js http://localhost:3000 --tablet

  # Single screenshot mode
  node screenshot.js http://localhost:3000 --single --device "iPhone 13"
`);
    process.exit(0);
  }

  // Auto-detect URL if not provided or if first arg is an option
  let url;
  let startIndex;
  if (args.length === 0 || args[0].startsWith('--')) {
    url = await autoDetectVifUrl();
    startIndex = 0; // Parse all args as options
  } else {
    url = args[0];
    startIndex = 1; // Skip URL, parse rest as options
  }

  // Calculate project root (4 levels up from .claude/skills/playwright/scripts/)
  const projectRoot = path.resolve(__dirname, '../../../..');
  const options = {
    prefix: 'screenshot',
    outputDir: path.join(projectRoot, 'screenshots'),
    fullPage: false,
    tablet: false,
    single: false,
    device: null,
    width: 1280,
    height: 720,
    timeout: 30000,
    waitForSelector: null
  };

  // Parse arguments
  for (let i = startIndex; i < args.length; i++) {
    switch (args[i]) {
      case '--prefix':
        options.prefix = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--fullPage':
        options.fullPage = true;
        break;
      case '--tablet':
        options.tablet = true;
        break;
      case '--single':
        options.single = true;
        break;
      case '--device':
        options.device = args[++i];
        break;
      case '--width':
        options.width = parseInt(args[++i]);
        break;
      case '--height':
        options.height = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--wait':
        options.waitForSelector = args[++i];
        break;
    }
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
    console.log(`📁 Created directory: ${options.outputDir}\n`);
  }

  const browser = await chromium.launch();

  try {
    if (options.single) {
      // Single screenshot mode
      await takeSingleScreenshot(browser, url, options);
    } else {
      // Multi-screenshot mode (default)
      await takeMultipleScreenshots(browser, url, options);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function takeSingleScreenshot(browser, url, options) {
  console.log(`📸 Taking screenshot of: ${url}`);

  const filename = `${options.prefix}.png`;
  const filepath = path.join(options.outputDir, filename);

  if (options.device) {
    console.log(`   Device: ${options.device}`);
  } else {
    console.log(`   Viewport: ${options.width}x${options.height}`);
  }
  if (options.fullPage) {
    console.log(`   Mode: Full page`);
  }

  let context;
  if (options.device && devices[options.device]) {
    context = await browser.newContext(devices[options.device]);
  } else {
    context = await browser.newContext({
      viewport: { width: options.width, height: options.height }
    });
  }

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeout });

  if (options.waitForSelector) {
    console.log(`   Waiting for: ${options.waitForSelector}`);
    await page.waitForSelector(options.waitForSelector, { timeout: options.timeout });
  }

  await page.screenshot({ path: filepath, fullPage: options.fullPage });
  await context.close();

  const absolutePath = path.resolve(filepath);
  console.log(`✅ Screenshot saved to: ${absolutePath}`);
}

async function takeMultipleScreenshots(browser, url, options) {
  console.log(`📸 Taking screenshots of: ${url}`);
  console.log(`   Output directory: ${options.outputDir}`);
  console.log(`   Prefix: ${options.prefix}`);
  if (options.fullPage) {
    console.log(`   Mode: Full page`);
  }
  console.log('');

  const screenshots = [];

  // Desktop screenshot
  const desktopFilename = `${options.prefix}-desktop.png`;
  const desktopPath = path.join(options.outputDir, desktopFilename);

  console.log(`💻 Desktop (1280x720)...`);
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: options.timeout });

  if (options.waitForSelector) {
    await desktopPage.waitForSelector(options.waitForSelector, { timeout: options.timeout });
  }

  await desktopPage.screenshot({ path: desktopPath, fullPage: options.fullPage });
  await desktopContext.close();
  screenshots.push({ device: 'Desktop', path: desktopPath });
  console.log(`   ✅ ${desktopFilename}`);

  // Mobile screenshot
  const mobileFilename = `${options.prefix}-mobile.png`;
  const mobilePath = path.join(options.outputDir, mobileFilename);

  console.log(`📱 iPhone 13...`);
  const mobileContext = await browser.newContext(devices['iPhone 13']);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: options.timeout });

  if (options.waitForSelector) {
    await mobilePage.waitForSelector(options.waitForSelector, { timeout: options.timeout });
  }

  await mobilePage.screenshot({ path: mobilePath, fullPage: options.fullPage });
  await mobileContext.close();
  screenshots.push({ device: 'iPhone 13', path: mobilePath });
  console.log(`   ✅ ${mobileFilename}`);

  // Tablet screenshot (optional)
  if (options.tablet) {
    const tabletFilename = `${options.prefix}-tablet.png`;
    const tabletPath = path.join(options.outputDir, tabletFilename);

    console.log(`📱 iPad Pro...`);
    const tabletContext = await browser.newContext(devices['iPad Pro']);
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(url, { waitUntil: 'networkidle', timeout: options.timeout });

    if (options.waitForSelector) {
      await tabletPage.waitForSelector(options.waitForSelector, { timeout: options.timeout });
    }

    await tabletPage.screenshot({ path: tabletPath, fullPage: options.fullPage });
    await tabletContext.close();
    screenshots.push({ device: 'iPad Pro', path: tabletPath });
    console.log(`   ✅ ${tabletFilename}`);
  }

  console.log('');
  console.log('✅ All screenshots completed!');
  console.log('');
  console.log('Summary:');
  screenshots.forEach(shot => {
    const absolutePath = path.resolve(shot.path);
    console.log(`   ${shot.device}: ${absolutePath}`);
  });
}

takeScreenshot();
