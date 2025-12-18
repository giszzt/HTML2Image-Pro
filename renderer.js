const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * High-Performance Web-to-Image Renderer (Playwright Edition)
 */
class PlaywrightRenderer {
    constructor() {
        this.browser = null;
        this.context = null;
        this.isBrowserLaunching = false;
    }

    /**
     * Initialize the browser instance
     */
    async init() {
        if (this.browser || this.isBrowserLaunching) return;

        this.isBrowserLaunching = true;
        try {
            console.log('🚀 Launching Playwright browser...');
            this.browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--font-render-hinting=none' // Improve text rendering consistency
                ]
            });

            console.log('✅ Browser launched successfully');
        } catch (error) {
            console.error('❌ Failed to launch browser:', error);
            throw error;
        } finally {
            this.isBrowserLaunching = false;
        }
    }

    /**
     * Calculate the bounding box of the visible content, excluding full-screen backgrounds
     * and invisible layout containers.
     */
    async calculateContentBounds(page, padding = 30) {
        console.log(`📐 Calculating content bounds with padding: ${padding}px...`);
        return await page.evaluate((padding) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

            console.log(`[Debug] Viewport: ${vw}x${vh}, Scroll: ${scrollX},${scrollY}, DocHeight: ${docHeight}`);

            function isBackgroundWrapper(el) {
                const rect = el.getBoundingClientRect();
                // Check if element covers the viewport (with some tolerance)
                const isFullWidth = Math.abs(rect.width - vw) < 50;
                const isFullHeight = Math.abs(rect.height - vh) < 50;
                return isFullWidth && isFullHeight;
            }

            function hasVisualContent(el, style) {
                // 1. Check for visible background (alpha > 0)
                const bgColor = style.backgroundColor;
                if (bgColor && bgColor !== 'transparent' && !bgColor.includes('rgba(0, 0, 0, 0)')) return true;

                // 2. Check for visible background image
                if (style.backgroundImage && style.backgroundImage !== 'none') return true;

                // 3. Check for visible border
                if (style.borderWidth && style.borderWidth !== '0px' && style.borderColor !== 'transparent') return true;

                // 4. Check for box shadow
                if (style.boxShadow && style.boxShadow !== 'none') return true;

                // 5. Check for specific tags that are inherently visual
                const visualTags = ['IMG', 'VIDEO', 'CANVAS', 'SVG', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'HR', 'IFRAME'];
                if (visualTags.includes(el.tagName)) return true;

                return false;
            }

            // Initialize with inverted values relative to document
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let foundContent = false;
            let lastElement = null;

            // 1. Traverse Elements
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let node;
            while (node = walker.nextNode()) {
                const style = window.getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

                // Skip background wrappers
                if (isBackgroundWrapper(node)) continue;

                const rect = node.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;

                // Only include if it has visual content
                if (hasVisualContent(node, style)) {
                    foundContent = true;
                    // Convert viewport coordinates to document coordinates
                    const absLeft = rect.left + scrollX;
                    const absTop = rect.top + scrollY;
                    const absRight = rect.right + scrollX;
                    const absBottom = rect.bottom + scrollY;

                    minX = Math.min(minX, absLeft);
                    minY = Math.min(minY, absTop);
                    maxX = Math.max(maxX, absRight);
                    maxY = Math.max(maxY, absBottom);

                    if (absBottom > maxY - 100) { // Keep track of elements near the bottom
                        lastElement = node.tagName + (node.className ? '.' + node.className : '');
                    }
                }
            }

            // 2. Traverse Text Nodes (to catch text in transparent containers)
            const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let textNode;
            while (textNode = textWalker.nextNode()) {
                // Skip empty text
                if (!textNode.textContent.trim()) continue;

                // Check parent visibility
                const parent = textNode.parentElement;
                if (!parent) continue;
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.opacity === '0') continue;
                if (isBackgroundWrapper(parent)) continue;

                // Get range rect for text
                const range = document.createRange();
                range.selectNodeContents(textNode);
                const rect = range.getBoundingClientRect();

                if (rect.width === 0 || rect.height === 0) continue;

                foundContent = true;
                // Convert viewport coordinates to document coordinates
                const absLeft = rect.left + scrollX;
                const absTop = rect.top + scrollY;
                const absRight = rect.right + scrollX;
                const absBottom = rect.bottom + scrollY;

                minX = Math.min(minX, absLeft);
                minY = Math.min(minY, absTop);
                maxX = Math.max(maxX, absRight);
                maxY = Math.max(maxY, absBottom);
            }

            console.log(`[Debug] Found content: ${foundContent}, Bounds: [${minX}, ${minY}, ${maxX}, ${maxY}], Last Element: ${lastElement}`);

            if (!foundContent) return null;

            // Add padding
            return {
                x: Math.max(0, minX - padding),
                y: Math.max(0, minY - padding),
                width: (maxX - minX) + (padding * 2),
                height: (maxY - minY) + (padding * 2)
            };
        }, padding);
    }

    /**
     * Capture a screenshot of the given input
     * @param {Object} options
     */
    /**
     * Capture a screenshot of the given input
     * @param {Object} options
     * @returns {Promise<Buffer>} The image buffer
     */
    async capture(options) {
        console.log('🎨 [Renderer] Capture called with options:', JSON.stringify(options, null, 2));
        const {
            input,
            inputType, // 'url' or 'html' or 'file'
            format = 'png',
            quality = 100,
            scale = 2,
            fullPage = true,
            smartCrop = false,
            smartCropPadding = 0, // Default padding
            viewportWidth = 1200, // Default viewport width
            dynamicMode = false, // Fast mode by default
            watermarkEnabled = false,
            watermarkText = ''
        } = options;

        if (!this.browser) {
            await this.init();
        }

        console.log(`🔧 [Renderer] Creating context with deviceScaleFactor: ${scale}, width: ${viewportWidth}, dynamicMode: ${dynamicMode}`);
        // Create a new context for each capture to support dynamic DPI (scale)
        const context = await this.browser.newContext({
            viewport: { width: viewportWidth, height: 900 },
            deviceScaleFactor: scale, // Dynamic DPI based on user input
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Enable console logging from the browser to Node.js
        page.on('console', msg => console.log(`🖥️ [Browser] ${msg.text()}`));

        try {
            // Set viewport
            await page.setViewportSize({
                width: viewportWidth,
                height: 900
            });

            console.log(`📄 Loading ${inputType}...`);

            // Load content
            const loadOptions = { waitUntil: 'domcontentloaded', timeout: 60000 };

            if (inputType === 'url') {
                await page.goto(input, loadOptions);
            } else if (inputType === 'html') {
                await page.setContent(input, loadOptions);
            } else if (inputType === 'file') {
                const content = fs.readFileSync(input, 'utf8');
                await page.setContent(content, loadOptions);
            }

            // Inject styles to stabilize rendering
            await page.addStyleTag({
                content: `
                    /* Disable animations for consistent snapshots */
                    *, *::before, *::after {
                        animation-duration: 0s !important;
                        transition-duration: 0s !important;
                        animation-delay: 0s !important;
                        transition-delay: 0s !important;
                    }
                    /* Hide scrollbars */
                    body::-webkit-scrollbar { 
                        display: none; 
                    }
                `
            });

            // ============ Wait for Fonts to Load ============
            console.log('🔤 Waiting for fonts to load...');
            try {
                await page.evaluate(() => document.fonts.ready);
                console.log('✅ Fonts loaded');
            } catch (e) {
                console.log('⚠️ Font loading check failed, proceeding anyway');
            }

            // ============ DYNAMIC MODE: Full processing for complex pages ============
            if (dynamicMode) {
                console.log('🔄 [Dynamic Mode] Enabled - Processing dynamic content...');

                // Wait for network idle (heuristic for "page loaded")
                try {
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                } catch (e) {
                    console.log('⚠️ Network idle timeout, proceeding anyway...');
                }

                // Smart Scroll to trigger lazy loading
                if (fullPage) {
                    await this.smartScroll(page);
                }

                // Final stability check
                await page.waitForTimeout(1000);
            } else {
                // ============ FAST MODE: Minimal wait for static pages ============
                console.log('⚡ [Fast Mode] Enabled - Quick capture for static content...');
                await page.waitForTimeout(200); // Brief stability wait
            }

            // Determine screenshot options
            let screenshotOptions = {
                type: format === 'jpg' ? 'jpeg' : format,
                quality: (format === 'jpg' || format === 'webp') ? quality : undefined,
                scale: 'device', // Use device pixels to respect deviceScaleFactor
                fullPage: true // ALWAYS take full page first if smart crop is enabled
            };

            let cropBounds = null;
            if (smartCrop) {
                cropBounds = await this.calculateContentBounds(page, smartCropPadding);
                if (cropBounds) {
                    console.log('✂️ [Smart Crop] Calculated bounds:', cropBounds);
                    // We DO NOT set screenshotOptions.clip here.
                    // We take the full page screenshot and crop it later with Sharp.
                } else {
                    console.log('⚠️ [Smart Crop] No content bounds found, using full page');
                }
            }

            console.log(`📸 Taking screenshot with scale ${scale}...`);
            let imageBuffer = await page.screenshot(screenshotOptions);
            let processedBuffer = imageBuffer;

            // Post-processing: Crop with Sharp if needed
            if (smartCrop && cropBounds) {
                console.log('🔪 [Sharp] Cropping image...');

                // Coordinates from calculateContentBounds are in CSS pixels.
                // We need to multiply by scale (deviceScaleFactor) for Sharp.
                const left = Math.round(cropBounds.x * scale);
                const top = Math.round(cropBounds.y * scale);
                const width = Math.round(cropBounds.width * scale);
                const height = Math.round(cropBounds.height * scale);

                console.log(`🔪 [Sharp] Cropping area (scaled): x=${left}, y=${top}, w=${width}, h=${height}`);

                processedBuffer = await sharp(imageBuffer)
                    .extract({ left, top, width, height })
                    .toBuffer();

                console.log('✅ Cropped image processed.');
            }

            // ============ Apply Watermark ============
            if (watermarkEnabled && watermarkText) {
                console.log('🏷️ [Sharp] Adding watermark:', watermarkText);
                const image = sharp(processedBuffer);
                const metadata = await image.metadata();

                // Create SVG text overlay
                const fontSize = Math.max(16, Math.round(metadata.width / 40));
                const padding = 20;
                const svgText = `
                    <svg width="${metadata.width}" height="${metadata.height}">
                        <defs>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.5"/>
                            </filter>
                        </defs>
                        <text 
                            x="${metadata.width - padding}" 
                            y="${metadata.height - padding}"
                            font-family="Arial, sans-serif"
                            font-size="${fontSize}"
                            font-weight="bold"
                            fill="rgba(255,255,255,0.8)"
                            text-anchor="end"
                            filter="url(#shadow)"
                        >${watermarkText}</text>
                    </svg>
                `;

                processedBuffer = await image
                    .composite([{
                        input: Buffer.from(svgText),
                        gravity: 'southeast'
                    }])
                    .toBuffer();

                console.log('✅ Watermark applied.');
            }

            console.log(`✅ Image processing complete (Size: ${(processedBuffer.length / 1024).toFixed(2)} KB)`);
            return processedBuffer;

        } catch (error) {
            console.error('❌ Capture failed:', error);
            throw error;
        } finally {
            await context.close();
        }
    }

    /**
     * Smart scrolling implementation
     * Scrolls down the page to trigger lazy loading, but faster than simple stepping.
     * AND "unrolls" the scrollable container to ensure full-page screenshots work.
     */
    async smartScroll(page) {
        console.log('📜 Starting smart scroll...');

        await page.evaluate(async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Find the main scrollable element
            const getScrollParent = () => {
                // Try to find a specific container that looks like the main scrollable area
                // 1. Check for elements with overflow-y: scroll/auto and large scrollHeight
                const allElements = document.querySelectorAll('*');
                let maxScrollHeight = 0;
                let bestCandidate = window; // Default to window

                for (const el of allElements) {
                    const style = window.getComputedStyle(el);
                    if ((style.overflowY === 'scroll' || style.overflowY === 'auto') && el.scrollHeight > el.clientHeight) {
                        // Ignore small scroll areas (like code blocks or small lists)
                        if (el.clientHeight < 300) continue;

                        if (el.scrollHeight > maxScrollHeight) {
                            maxScrollHeight = el.scrollHeight;
                            bestCandidate = el;
                        }
                    }
                }

                // If no specific container found, or if body/html is larger, use window
                const docHeight = Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                );

                if (docHeight > maxScrollHeight) {
                    return window;
                }

                return bestCandidate;
            };

            const scroller = getScrollParent();
            const isWindow = scroller === window;

            const getScrollHeight = () => {
                if (isWindow) {
                    return Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight
                    );
                }
                return scroller.scrollHeight;
            };

            const scrollTo = (y) => {
                if (isWindow) {
                    window.scrollTo(0, y);
                } else {
                    scroller.scrollTop = y;
                }
            };

            const getClientHeight = () => {
                if (isWindow) {
                    return window.innerHeight;
                }
                return scroller.clientHeight;
            };

            let currentPosition = 0;
            const viewportHeight = getClientHeight();

            console.log(`📜 Scrolling ${isWindow ? 'window' : 'container'}...`);

            // 1. Scroll down to trigger lazy loads
            while (true) {
                currentPosition += viewportHeight;
                scrollTo(currentPosition);

                await delay(200);

                const newHeight = getScrollHeight();

                if (currentPosition >= newHeight) {
                    await delay(1000);
                    const finalHeight = getScrollHeight();
                    if (finalHeight <= newHeight) {
                        break;
                    }
                }
            }

            // 2. Scroll back to top
            scrollTo(0);
            await delay(1000);

            // 3. "Unroll" the container if it's not the window
            // This forces the container to expand to its full height, pushing the body height down.
            // This allows page.screenshot (which scrolls the window) to capture the full content.
            if (!isWindow) {
                console.log('📜 Unrolling scroll container for screenshot...');
                scroller.style.height = 'auto';
                scroller.style.maxHeight = 'none';
                scroller.style.overflow = 'visible';
                scroller.style.overflowY = 'visible';

                // Sometimes we need to unroll parents too if they have fixed height
                let parent = scroller.parentElement;
                while (parent && parent !== document.body && parent !== document.documentElement) {
                    const style = window.getComputedStyle(parent);
                    if (style.height !== 'auto' || style.overflow !== 'visible') {
                        parent.style.height = 'auto';
                        parent.style.maxHeight = 'none';
                        parent.style.overflow = 'visible';
                    }
                    parent = parent.parentElement;
                }

                // Wait for layout update
                await delay(500);
            }
        });

        console.log('📜 Smart scroll completed');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }
}

module.exports = PlaywrightRenderer;
