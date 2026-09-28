const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('{currentScreen === "')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
