const PlaywrightRenderer = require('./renderer');
const path = require('path');

async function test() {
    const renderer = new PlaywrightRenderer();

    try {
        console.log('Starting test...');
        await renderer.init();

        // Test with a complex dynamic site if possible, or just a simple one
        // Using a known dynamic site or a local file if available
        // Let's try a public URL that is usually dynamic
        const url = 'https://www.example.com';

        const outputPath = path.join(__dirname, 'test-result.png');

        await renderer.capture({
            input: url,
            inputType: 'url',
            outputPath: outputPath,
            fullPage: true
        });

        console.log('Test completed successfully!');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await renderer.close();
    }
}

test();
