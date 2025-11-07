---
name: playwright
description: This skill should be used when the user wants to take screenshots of websites. It provides Playwright-based screenshot capabilities with smart defaults for the Vif project (localhost:3000 or vif.mpeters.dev). Use this skill when users request screenshots, visual testing, or need to capture web page renders.
---

# Playwright Screenshot Skill

## Overview

This skill enables quick website screenshots using Playwright with browser automation. **By default, it takes BOTH desktop and mobile screenshots in one command** for maximum efficiency. The script automatically creates the screenshots directory and handles all setup.

## Quick Start - Fast Multi-Screenshot Workflow

**Default behavior: Takes desktop + mobile screenshots together (one command, two screenshots!)**

**IMPORTANT: No manual server checks needed!** Simply run the screenshot command directly. The script handles everything automatically.

### Simplest Usage (Recommended)

Just run this command directly - no curl checks or server status verification needed:

```bash
cd .claude/skills/playwright/scripts && node screenshot.js http://localhost:3000 --prefix vif
```

This creates:
- `screenshots/vif-desktop.png` (1280x720)
- `screenshots/vif-mobile.png` (iPhone 13)

### For Live Site

```bash
cd .claude/skills/playwright/scripts && node screenshot.js https://vif.mpeters.dev --prefix vif
```

**Key efficiency gains:**
- **No pre-checks needed**: Skip curl commands, run the screenshot directly
- One script call = multiple screenshots
- Screenshots directory auto-created
- Desktop + mobile covered by default
- Add `--tablet` for iPad Pro screenshot too

## Installation

**IMPORTANT: Run this ONCE before first use:**

```bash
cd .claude/skills/playwright/scripts && npm install && npx playwright install chromium
```

This installs Playwright and downloads the Chromium browser binary (~120MB, takes ~30 seconds).

## Core Capabilities

### 1. Multi-Screenshot (DEFAULT - FASTEST!)

Takes desktop + mobile screenshots in ONE command:

```bash
# Auto-detect URL (checks localhost:3000, falls back to vif.mpeters.dev)
node screenshot.js --prefix <name>

# Or specify URL explicitly
node screenshot.js <url> --prefix <name>
```

**Example:**
```bash
node screenshot.js http://localhost:3000 --prefix vif
```
Creates: `vif-desktop.png` + `vif-mobile.png`

**Add tablet:**
```bash
node screenshot.js --prefix vif --tablet
```
Creates: `vif-desktop.png` + `vif-mobile.png` + `vif-tablet.png`

### 2. Full Page Mode

Add `--fullPage` to capture entire scrollable page:

```bash
node screenshot.js https://vif.mpeters.dev --prefix vif --fullPage
```

### 3. Single Screenshot Mode

For specific device/viewport only:

```bash
node screenshot.js <url> --single --device "iPhone 13"
node screenshot.js <url> --single --width 1920 --height 1080
```

### 4. Wait for Element

Wait for CSS selector before capturing:

```bash
node screenshot.js <url> --prefix vif --wait ".todo-list"
```

### 5. Custom Output Directory

```bash
node screenshot.js <url> --prefix vif --output-dir ./custom/path
```

## Screenshot Organization

The script **auto-creates** the `screenshots/` directory. Default structure:

```
screenshots/
├── vif-desktop.png
├── vif-mobile.png
├── vif-tablet.png (if --tablet used)
└── [custom-prefix]-*.png
```

The directory is automatically created - no manual setup needed!

## Common Workflows

### Workflow 1: Quick Vif Screenshot (MOST COMMON)

**One command = Desktop + Mobile!**

```bash
cd .claude/skills/playwright/scripts && node screenshot.js http://localhost:3000 --prefix vif
# Creates: vif-desktop.png + vif-mobile.png
```

### Workflow 2: Full Page Documentation

```bash
cd .claude/skills/playwright/scripts
node screenshot.js https://vif.mpeters.dev --prefix vif --fullPage --tablet
# Creates: vif-desktop.png + vif-mobile.png + vif-tablet.png (all full page)
```

### Workflow 3: Before/After Comparison

```bash
# Before changes
node screenshot.js http://localhost:3000 --prefix before --fullPage

# [Make code changes, rebuild if needed]

# After changes
node screenshot.js http://localhost:3000 --prefix after --fullPage

# Compare: before-desktop.png vs after-desktop.png, before-mobile.png vs after-mobile.png
```

### Workflow 4: External Site

```bash
node screenshot.js https://example.com --prefix example --fullPage
```

## Error Handling

**Common issues:**

1. **Server not accessible**: Check if development server is running (`npm run dev`)
2. **Timeout error**: Increase timeout with `--timeout 60000`
3. **Element not found**: Verify selector with browser DevTools before using `--wait`
4. **Chromium not installed**: Run `npx playwright install chromium`

**Debugging tips:**
- Test URL in browser first
- Check console logs for error messages
- Verify output path is writable
- Ensure proper viewport size for content

## Script Location

The screenshot script is located at:
```
.claude/skills/playwright/scripts/screenshot.js
```

Always run from within the `scripts/` directory or use relative paths correctly.

## Best Practices

1. **Run screenshot command directly** - No need to check if server is running with curl first
2. **Use descriptive filenames** (e.g., `vif-mobile-todos.png` not `screenshot.png`)
3. **Full page for documentation**, viewport for specific UI states
4. **Wait for dynamic content** with `--wait` selector
5. **Use device presets** instead of manual viewport sizes when possible
6. **Organize by feature** when doing before/after comparisons

## Limitations

- Requires Node.js installed
- Chromium browser must be downloaded (via `npx playwright install chromium`)
- Screenshots are static captures, not interactive
- No support for authenticated pages (would need manual cookie/session handling)
- Network idle detection may not work for all sites (streaming, websockets)
