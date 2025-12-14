const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'nul');
try {
    fs.unlinkSync(file);
    console.log('Successfully deleted nul file');
} catch (e) {
    console.error('Error deleting nul:', e);
}
