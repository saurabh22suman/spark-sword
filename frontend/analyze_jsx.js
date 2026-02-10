const fs = require('fs');
const content = fs.readFileSync('src/components/playground/PlaygroundV3Revamp.tsx', 'utf-8');
const lines = content.split('\n');

// Track JSX tags from main return statement (line 682)
let motionDivCount = 0;
let depth = 0;

for (let i = 681; i <  1110; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Count motion.div opens
  if (line.includes('<motion.div') && !line.includes('</motion.div>')) {
    motionDivCount++;
    console.log(`Line ${lineNum}: Opened motion.div (depth: ${motionDivCount})`);
  }
  
  // Count motion.div closes
  if (line.includes('</motion.div>')) {
    console.log(`Line ${lineNum}: Closed motion.div (depth: ${motionDivCount})`);
    motionDivCount--;
  }
}

console.log(`\nFinal motion.div count: ${motionDivCount} (should be 0)`);
