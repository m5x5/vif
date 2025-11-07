# Playwright Screenshot Skill

A Claude Code skill for taking website screenshots using Playwright. **Takes desktop + mobile screenshots together by default** for maximum efficiency!

## Features

- ⚡ **Multi-screenshot by default** - One command = Desktop + Mobile screenshots
- 🎯 Smart defaults for Vif project (localhost:3000 or vif.mpeters.dev)
- 📱 Device emulation (iPhone 13, iPad Pro, Desktop)
- 📄 Full page or viewport screenshots
- 📁 Auto-creates screenshots directory
- ⏱️ Wait for specific elements before capturing

## Installation

### Install Skill Dependencies

Before using the skill, install Playwright:

```bash
cd .claude/skills/playwright/scripts
npm install
npx playwright install chromium
```

This downloads the Chromium browser (~120MB) needed for screenshots.

## Usage

Simply ask Claude to take screenshots - **it will automatically take both desktop and mobile!**

**Examples:**
- "Take a screenshot of the website" → Gets desktop + mobile
- "Screenshot localhost:3000" → Gets desktop + mobile
- "Take a full page screenshot" → Gets desktop + mobile (full page)
- "Screenshot with tablet too" → Gets desktop + mobile + tablet

Claude will:
1. Check if localhost:3000 is running (returns 200)
2. Use localhost if available, otherwise ask about vif.mpeters.dev
3. Take BOTH desktop and mobile screenshots in one command
4. Auto-create the `screenshots/` directory
5. Save with descriptive filenames (e.g., `vif-desktop.png`, `vif-mobile.png`)

## Script Usage

You can also run the script directly:

```bash
cd .claude/skills/playwright/scripts

# Default: Desktop + Mobile
node screenshot.js http://localhost:3000 --prefix vif

# Full page: Desktop + Mobile
node screenshot.js https://vif.mpeters.dev --prefix vif --fullPage

# Include tablet: Desktop + Mobile + Tablet
node screenshot.js http://localhost:3000 --prefix vif --tablet

# Single screenshot mode (only one device)
node screenshot.js http://localhost:3000 --single --device "iPhone 13"
```

## Options

- `--prefix <name>` - Filename prefix (default: screenshot)
- `--output-dir <path>` - Output directory (default: ../../../screenshots)
- `--fullPage` - Capture full scrollable page
- `--tablet` - Include tablet (iPad Pro) screenshot
- `--single` - Single screenshot mode instead of multi
- `--device <name>` - Device for single mode (e.g., "iPhone 13")
- `--width/height <px>` - Viewport size for single mode
- `--timeout <ms>` - Navigation timeout (default: 30000)
- `--wait <selector>` - Wait for CSS selector before screenshot

## Common Workflows

### Quick Vif Screenshot
Ask: "Take a screenshot of the website"
→ Gets `vif-desktop.png` + `vif-mobile.png`

### Include Tablet
Ask: "Screenshot with tablet too"
→ Gets `vif-desktop.png` + `vif-mobile.png` + `vif-tablet.png`

### Before/After Comparison
1. Ask: "Take a before screenshot"
2. Make your code changes
3. Ask: "Take an after screenshot"
→ Compare: `before-desktop.png` vs `after-desktop.png`, etc.

### External Website
Ask: "Screenshot https://example.com with prefix example"
→ Gets `example-desktop.png` + `example-mobile.png`

## Troubleshooting

**"Command failed" or "Browser not found":**
Run `npx playwright install chromium` in the scripts directory.

**Timeout errors:**
The site may be slow to load. Ask Claude to increase the timeout.

**Server not running:**
Claude will detect this and ask if you want to use vif.mpeters.dev instead.

## File Structure

```
.claude/skills/playwright/
├── SKILL.md              # Skill instructions for Claude
├── README.md             # This file
└── scripts/
    ├── package.json      # Dependencies
    └── screenshot.js     # Screenshot script
```

Screenshots are saved to: `screenshots/` (created automatically)
