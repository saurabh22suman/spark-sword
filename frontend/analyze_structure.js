const fs = require('fs');
const content = fs.readFileSync('src/components/playground/PlaygroundV3Revamp.tsx', 'utf-8');
const lines = content.split('\n');

// Print JSX structure with indentation
for (let i = 681; i < 830; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Skip if completely blank
  if (!line.trim()) continue;
  
  // Highlight lines with JSX tags
  if (line.includes('<') || line.includes('>') || line.includes('{/*') || lineNum === 804) {
    console.log(`${lineNum}: ${line}`);
  }
}
