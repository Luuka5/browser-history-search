const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 48, 128];
const iconDir = path.join(__dirname, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir);
}

// Generate icons for each size
sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#24292e';
    ctx.fillRect(0, 0, size, size);

    // Draw chat bubble
    ctx.fillStyle = '#2ea44f';
    const bubbleSize = size * 0.6;
    const bubbleX = (size - bubbleSize) / 2;
    const bubbleY = (size - bubbleSize) / 2;
    ctx.beginPath();
    ctx.arc(bubbleX + bubbleSize / 2, bubbleY + bubbleSize / 2, bubbleSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconDir, `icon${size}.png`), buffer);
}); 