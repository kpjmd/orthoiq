// Create AI in Orthopedic Surgery Market Growth Chart
// Data based on the research findings from the article

// Market data points
const marketData = [
  { year: 2024, value: 307, label: '$307M' },
  { year: 2025, value: 405, label: '$405M' },
  { year: 2026, value: 535, label: '$535M' },
  { year: 2027, value: 706, label: '$706M' },
  { year: 2028, value: 932, label: '$932M' },
  { year: 2029, value: 1230, label: '$1.23B' },
  { year: 2030, value: 1624, label: '$1.62B' },
  { year: 2031, value: 2144, label: '$2.14B' },
  { year: 2032, value: 2832, label: '$2.83B' }
];

// FDA approval comparison data
const fdaData = [
  { category: 'Orthopedics', approvals: 1, color: '#e74c3c' },
  { category: 'Radiology', approvals: 531, color: '#3498db' }
];

// Create SVG chart
const width = 800;
const height = 600;
const margin = { top: 60, right: 80, bottom: 80, left: 80 };
const chartWidth = width - margin.left - margin.right;
const chartHeight = height - margin.top - margin.bottom;

let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: #f8f9fa;">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f8f9fa"/>
  
  <!-- Title -->
  <text x="${width/2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#2c3e50">
    AI in Orthopedic Surgery: Market Growth &amp; Regulatory Status
  </text>
  
  <!-- Subtitle -->
  <text x="${width/2}" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d">
    Market expansion from $307M to $2.8B (32% CAGR) vs. FDA approval disparity
  </text>
  
  <!-- Main chart background -->
  <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="white" stroke="#dee2e6" stroke-width="1"/>
`;

// Add gradient definition
svg += `
  <defs>
    <linearGradient id="marketGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3498db;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#3498db;stop-opacity:0.1" />
    </linearGradient>
  </defs>
`;

// Calculate scales
const maxValue = Math.max(...marketData.map(d => d.value));
const minYear = Math.min(...marketData.map(d => d.year));
const maxYear = Math.max(...marketData.map(d => d.year));

// Draw grid lines (horizontal)
const gridLines = 5;
for (let i = 0; i <= gridLines; i++) {
  const y = margin.top + (chartHeight * i / gridLines);
  const value = maxValue * (1 - i / gridLines);
  
  svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#ecf0f1" stroke-width="1"/>`;
  
  // Y-axis labels
  const label = value >= 1000 ? `$${(value/1000).toFixed(1)}B` : `$${Math.round(value)}M`;
  svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d">${label}</text>`;
}

// Draw market growth line and area
let pathD = '';
let areaD = '';
marketData.forEach((d, i) => {
  const x = margin.left + (chartWidth * (d.year - minYear) / (maxYear - minYear));
  const y = margin.top + chartHeight - (chartHeight * d.value / maxValue);
  
  if (i === 0) {
    pathD += `M ${x} ${y}`;
    areaD += `M ${x} ${margin.top + chartHeight} L ${x} ${y}`;
  } else {
    pathD += ` L ${x} ${y}`;
    areaD += ` L ${x} ${y}`;
  }
});
areaD += ` L ${margin.left + chartWidth} ${margin.top + chartHeight} Z`;

// Draw area under curve
svg += `<path d="${areaD}" fill="url(#marketGradient)"/>`;

// Draw main line
svg += `<path d="${pathD}" fill="none" stroke="#3498db" stroke-width="3"/>`;

// Draw data points and labels
marketData.forEach((d, i) => {
  const x = margin.left + (chartWidth * (d.year - minYear) / (maxYear - minYear));
  const y = margin.top + chartHeight - (chartHeight * d.value / maxValue);
  
  // Data point circle
  svg += `<circle cx="${x}" cy="${y}" r="4" fill="#2c3e50" stroke="white" stroke-width="2"/>`;
  
  // Data labels (show every other year to avoid crowding)
  if (i % 2 === 0 || i === marketData.length - 1) {
    svg += `<text x="${x}" y="${y - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#2c3e50">${d.label}</text>`;
  }
  
  // X-axis labels
  svg += `<text x="${x}" y="${margin.top + chartHeight + 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d">${d.year}</text>`;
});

// Add 32% CAGR annotation
const midX = margin.left + chartWidth/2;
const midY = margin.top + chartHeight/2;
svg += `
  <rect x="${midX - 40}" y="${midY - 15}" width="80" height="30" fill="white" stroke="#3498db" stroke-width="1" rx="5"/>
  <text x="${midX}" y="${midY - 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#3498db">32% CAGR</text>
  <text x="${midX}" y="${midY + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#7f8c8d">2024-2032</text>
`;

// FDA Approval Comparison Section
const comparisonY = margin.top + chartHeight + 60;
svg += `
  <text x="${margin.left}" y="${comparisonY}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">FDA AI Device Approvals: Orthopedics vs. Radiology</text>
`;

// Draw comparison bars
const barWidth = 60;
const barSpacing = 120;
fdaData.forEach((d, i) => {
  const x = margin.left + 50 + (i * (barWidth + barSpacing));
  const maxBarHeight = 80;
  const barHeight = Math.max(5, (d.approvals / Math.max(...fdaData.map(item => item.approvals))) * maxBarHeight);
  const barY = comparisonY + 60 - barHeight;
  
  // Bar
  svg += `<rect x="${x}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${d.color}" rx="3"/>`;
  
  // Value label on bar
  svg += `<text x="${x + barWidth/2}" y="${barY - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${d.color}">${d.approvals}</text>`;
  
  // Category label
  svg += `<text x="${x + barWidth/2}" y="${comparisonY + 80}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d">${d.category}</text>`;
});

// Key statistics callout
svg += `
  <rect x="${width - 280}" y="${comparisonY + 10}" width="260" height="70" fill="#e8f5e8" stroke="#27ae60" stroke-width="2" rx="5"/>
  <text x="${width - 270}" y="${comparisonY + 30}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#27ae60">Key Market Insights:</text>
  <text x="${width - 270}" y="${comparisonY + 45}" font-family="Arial, sans-serif" font-size="11" fill="#2c3e50">• 200,000+ patients treated (2022-2025)</text>
  <text x="${width - 270}" y="${comparisonY + 58}" font-family="Arial, sans-serif" font-size="11" fill="#2c3e50">• Success rates: 39% → 93% improvement</text>
  <text x="${width - 270}" y="${comparisonY + 71}" font-family="Arial, sans-serif" font-size="11" fill="#2c3e50">• Regulatory gap represents opportunity</text>
`;

// X-axis title
svg += `<text x="${margin.left + chartWidth/2}" y="${margin.top + chartHeight + 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2c3e50">Year</text>`;

// Y-axis title
svg += `<text x="25" y="${margin.top + chartHeight/2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2c3e50" transform="rotate(-90, 25, ${margin.top + chartHeight/2})">Market Value</text>`;

svg += `</svg>`;

console.log("✅ Market Growth Chart Generated Successfully");
console.log("📊 Chart Features:");
console.log("   - Market projection: $307M → $2.83B");
console.log("   - 32% CAGR (2024-2032)");
console.log("   - FDA approval comparison");
console.log("   - Key clinical insights");
console.log("   - Professional medical styling");
console.log("");
console.log("🎨 Visual Elements:");
console.log("   - Gradient area chart");
console.log("   - Data point markers");
console.log("   - Comparison bars");
console.log("   - Statistical callouts");
console.log("");
console.log("📁 Ready for export as 'ai-orthopedic-market-growth.svg'");

// Output the complete SVG
svg;