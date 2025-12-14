const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const open = require('open');
const sharp = require('sharp'); // Keep sharp for other potential uses
const PlaywrightRenderer = require('./renderer');

// Setup temp directory
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3015;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/temp', express.static(tempDir));
app.use(express.static(__dirname));

// Cleanup task
function cleanupTempFiles() {
    fs.readdir(tempDir, (err, files) => {
        if (err) return console.error('Error cleaning temp files:', err);
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                if (stats.mtimeMs < oneHourAgo) {
                    fs.unlink(filePath, () => { });
                }
            });
        });
    });
}
setInterval(cleanupTempFiles, 3600000);

// Initialize Renderer
const renderer = new PlaywrightRenderer();

// Routes
app.post('/convert/url', async (req, res) => {
    const { url, settings } = req.body;
    console.log('📨 [Server] Received /convert/url request');
    console.log('📦 [Server] Body settings:', settings);
    const { format, scale, smartCrop, smartCropPadding, width, dynamicMode, watermarkEnabled, watermarkText } = settings || {};
    console.log(`🔍 [Server] Extracted scale: ${scale} (Type: ${typeof scale})`);

    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const outputFileName = `${uuidv4()}.${format || 'png'}`;
        const outputPath = path.join(tempDir, outputFileName);

        await renderer.capture({
            input: url,
            inputType: 'url',
            outputPath,
            format: format || 'png',
            scale: Number(scale) || 2,
            smartCrop: !!smartCrop,
            smartCropPadding: smartCropPadding !== undefined ? Number(smartCropPadding) : 0,
            viewportWidth: Number(width) || 1200,
            dynamicMode: !!dynamicMode,
            watermarkEnabled: !!watermarkEnabled,
            watermarkText: watermarkText || ''
        });

        res.json({ success: true, imageUrl: `/temp/${outputFileName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/convert/html', async (req, res) => {
    const { html, settings } = req.body;
    const { format, scale, smartCrop, smartCropPadding, width, dynamicMode, watermarkEnabled, watermarkText } = settings || {};

    if (!html) return res.status(400).json({ error: 'HTML content is required' });

    try {
        const outputFileName = `${uuidv4()}.${format || 'png'}`;
        const outputPath = path.join(tempDir, outputFileName);

        await renderer.capture({
            input: html,
            inputType: 'html',
            outputPath,
            format: format || 'png',
            scale: Number(scale) || 2,
            smartCrop: !!smartCrop,
            smartCropPadding: smartCropPadding !== undefined ? Number(smartCropPadding) : 0,
            viewportWidth: Number(width) || 1200,
            dynamicMode: !!dynamicMode,
            watermarkEnabled: !!watermarkEnabled,
            watermarkText: watermarkText || ''
        });

        res.json({ success: true, imageUrl: `/temp/${outputFileName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/convert/file', upload.single('htmlFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'HTML file is required' });

    try {
        const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
        const { format, scale, smartCrop, smartCropPadding, width, dynamicMode, watermarkEnabled, watermarkText } = settings;

        const filePath = req.file.path;
        const outputFileName = `${uuidv4()}.${format || 'png'}`;
        const outputPath = path.join(tempDir, outputFileName);

        await renderer.capture({
            input: filePath,
            inputType: 'file',
            outputPath,
            format: format || 'png',
            scale: Number(scale) || 2,
            smartCrop: !!smartCrop,
            smartCropPadding: smartCropPadding !== undefined ? Number(smartCropPadding) : 0,
            viewportWidth: Number(width) || 1200,
            dynamicMode: !!dynamicMode,
            watermarkEnabled: !!watermarkEnabled,
            watermarkText: watermarkText || ''
        });

        // Cleanup uploaded file
        fs.unlinkSync(filePath);

        res.json({ success: true, imageUrl: `/temp/${outputFileName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    // Initialize browser immediately
    await renderer.init();

    console.log('Opening browser...');
    setTimeout(() => {
        open(`http://localhost:${PORT}/index.html`);
    }, 1000);
});
