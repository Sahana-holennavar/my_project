const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname);
const oversizedFilePath = path.join(fixturesDir, 'oversized-test-file.pdf');

const targetSizeMB = 11;
const targetSizeBytes = targetSizeMB * 1024 * 1024;

const chunk = Buffer.alloc(1024, 'A');
const chunks = [];

let currentSize = 0;
while (currentSize < targetSizeBytes) {
    chunks.push(chunk);
    currentSize += chunk.length;
}

const oversizedBuffer = Buffer.concat(chunks);

fs.writeFileSync(oversizedFilePath, oversizedBuffer);

const actualSizeMB = (fs.statSync(oversizedFilePath).size / (1024 * 1024)).toFixed(2);
console.log(`✅ Generated oversized test file: ${oversizedFilePath}`);
console.log(`   Size: ${actualSizeMB} MB (target: ${targetSizeMB} MB)`);
console.log(`   This file exceeds the 10MB limit for testing.`);

