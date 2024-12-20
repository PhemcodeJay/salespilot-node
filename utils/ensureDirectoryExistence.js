const fs = require('fs');
const path = require('path');

const ensureDirectoryExistence = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

module.exports = ensureDirectoryExistence;
