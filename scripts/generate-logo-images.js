const fs = require('fs');
const path = require('path');

// Simple SVG to generate logo images
function generateLogoSVG(width, height, variant = 'blue') {
  const gradients = {
    blue: { start: '#3b82f6', mid: '#1e40af', end: '#1d4ed8' },
    teal: { start: '#0891b2', mid: '#0e7490', end: '#164e63' },
    monochrome: { start: '#374151', mid: '#1f2937', end: '#111827' }
  };
  
  const colors = gradients[variant] || gradients.blue;
  const holeSize = Math.min(width * 0.75, height * 0.375);
  const borderRadius = width * 0.5;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors.start}" />
          <stop offset="50%" stop-color="${colors.mid}" />
          <stop offset="100%" stop-color="${colors.end}" />
        </linearGradient>
        <linearGradient id="diagonal-line" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="42%" stop-color="transparent" />
          <stop offset="50%" stop-color="white" />
          <stop offset="58%" stop-color="transparent" />
        </linearGradient>
        <mask id="main-shape-mask">
          <rect width="100%" height="100%" fill="white" />
          <circle cx="${width / 2}" cy="${height / 2}" r="${holeSize / 2}" fill="black" />
        </mask>
      </defs>
      
      <!-- Main shape with gradient -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="url(#logo-gradient)" />
      
      <!-- Center hole for infinity twist effect -->
      <circle cx="${width / 2}" cy="${height / 2}" r="${holeSize / 2}" fill="white" />
      
      <!-- 45-degree diagonal line that suggests "Q" tail - masked to avoid center hole -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="url(#diagonal-line)" mask="url(#main-shape-mask)" />
    </svg>
  `;
}

// Generate different sized logo files
const sizes = [
  { name: 'icon.png', width: 512, height: 1024 }, // Favicon/app icon
  { name: 'splash-image.png', width: 100, height: 200 }, // Splash screen
  { name: 'logo.png', width: 256, height: 512 }, // General use
];

sizes.forEach(size => {
  const svg = generateLogoSVG(size.width, size.height, 'blue');
  const filePath = path.join(__dirname, '../public', size.name.replace('.png', '.svg'));
  fs.writeFileSync(filePath, svg);
  console.log(`Generated ${size.name.replace('.png', '.svg')}`);
});

console.log('Logo SVG files generated successfully!');
console.log('To convert to PNG, you can use:');
console.log('- Online converters like https://svgtopng.com/');
console.log('- Command line tools like ImageMagick or Inkscape');
console.log('- Or keep as SVG for better scaling');