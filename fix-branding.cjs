/**
 * fix-branding.cjs
 * Run from the root of jarvis-admin:
 *   node fix-branding.cjs
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = process.cwd();
const NEW_LOGO    = '/assets/javis.png';
const BRAND_NAME  = 'Jarvis Admin';
const DRY_RUN     = process.argv.includes('--dry');

const EXTENSIONS  = ['.ts', '.tsx', '.js', '.jsx', '.html', '.json', '.css', '.svg'];
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel'];

const LOGO_PATTERNS = [
  /(['"`])([^'"`]*washlab[^'"`]*\.(png|jpg|jpeg|svg|webp))(['"`])/gi,
  /(src\s*=\s*['"`])([^'"`]*(logo|icon|brand)[^'"`]*)(['"`])/gi,
  /(from\s+['"`])([^'"`]*(logo|icon)[^'"`]*\.(png|jpg|jpeg|svg|webp))(['"`])/gi,
];

const BRAND_PATTERNS = [
  /WashLab\s+Attendant/gi,
  /washlab[-_]attendant/gi,
];

function walk(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.includes(e.name)) walk(full, results);
    } else if (e.isFile() && EXTENSIONS.includes(path.extname(e.name))) {
      results.push(full);
    }
  }
  return results;
}

function applyFixes(content) {
  let changed = false;
  let next    = content;

  for (const pat of LOGO_PATTERNS) {
    const before = next;
    next = next.replace(pat, (...args) => {
      const full = args[0];
      return full.replace(
        /(['"`\/])([^'"`]*?(logo|icon|washlab)[^'"`]*?\.(png|jpg|jpeg|svg|webp))/gi,
        (m, quote) => quote + NEW_LOGO.replace(/^\//, '')
      );
    });
    if (next !== before) changed = true;
  }

  for (const pat of BRAND_PATTERNS) {
    const before = next;
    next = next.replace(pat, (match) => {
      if (match === match.toLowerCase()) return BRAND_NAME.toLowerCase();
      if (match.includes('-'))          return BRAND_NAME.toLowerCase().replace(' ', '-');
      if (match.includes('_'))          return BRAND_NAME.toLowerCase().replace(' ', '_');
      return BRAND_NAME;
    });
    if (next !== before) changed = true;
  }

  return { next, changed };
}

function fixMetadataExports(content) {
  return content
    .replace(/(icon\s*:\s*['"`])([^'"`]+)(['"`])/g,  `$1${NEW_LOGO}$3`)
    .replace(/(apple\s*:\s*['"`])([^'"`]+)(['"`])/g, `$1${NEW_LOGO}$3`);
}

function fixMetaFiles() {
  const targets = [
    'public/manifest.json', 'public/site.webmanifest',
    'next.config.js', 'next.config.ts', 'next.config.mjs', 'package.json',
  ];
  for (const rel of targets) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    const { next, changed } = applyFixes(content);
    if (changed) {
      console.log(`\n✏️  ${rel}`);
      if (!DRY_RUN) fs.writeFileSync(full, next, 'utf8');
      else console.log('   (dry run – not written)');
    }
  }
}

console.log(`\n🔍  Scanning ${ROOT} …`);
if (DRY_RUN) console.log('   DRY RUN – no files will be modified\n');

const files   = walk(ROOT);
let   touched = 0;

for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }

  let { next, changed } = applyFixes(content);

  if (/layout|_document|_app/.test(path.basename(file))) {
    const before = next;
    next = fixMetadataExports(next);
    if (next !== before) changed = true;
  }

  if (!changed) continue;

  const rel = path.relative(ROOT, file);
  console.log(`\n✏️  ${rel}`);

  const oldLines = content.split('\n');
  const newLines = next.split('\n');
  oldLines.forEach((line, i) => {
    if (line !== newLines[i]) {
      console.log(`   - ${line.trim()}`);
      console.log(`   + ${newLines[i].trim()}`);
    }
  });

  if (!DRY_RUN) { fs.writeFileSync(file, next, 'utf8'); touched++; }
}

fixMetaFiles();

console.log(`\n✅  Done. ${DRY_RUN ? '(dry run)' : `${touched} file(s) updated.`}`);
console.log(`\n💡  Also check:`);
console.log(`    • public/favicon.ico → replace with javis.png-derived favicon`);
console.log(`    • Vercel dashboard → Settings → General → Project Name\n`);