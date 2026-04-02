const fs = require('fs');
let c = fs.readFileSync('components/AdminLayout.tsx', 'utf8');

// Find and remove the Bottom CTA section
const start = c.indexOf('      {/* Bottom CTA */}');
const end = c.indexOf('    </>\n  )\n}', start);

if (start !== -1) {
  c = c.slice(0, start) + c.slice(end);
  fs.writeFileSync('components/AdminLayout.tsx', c);
  console.log('done:', c.includes('Add New Staff') ? 'STILL THERE' : 'REMOVED');
} else {
  console.log('Could not find Bottom CTA block');
}
