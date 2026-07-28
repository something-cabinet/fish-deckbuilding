import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/sprites/overlays');
fs.mkdirSync(outDir, { recursive: true });

const THICK = 4;
const LEN = 12;

const types = {
  move:   { color: '#e8dcc5', opacity: '0.60', name: 'Move' },
  attack: { color: '#e85d4e', opacity: '0.70', name: 'Attack' },
  summon: { color: '#22c55e', opacity: '0.60', name: 'Summon' },
  spell:  { color: '#3b82f6', opacity: '0.60', name: 'Spell' },
};

function makeMaskSvg(mask, color, opacity) {
  const hasTop    = (mask & 1) !== 0;
  const hasRight  = (mask & 2) !== 0;
  const hasBottom = (mask & 4) !== 0;
  const hasLeft   = (mask & 8) !== 0;

  const arms = [];
  
  // Top-left corner
  if (!hasTop)    arms.push({ x: 0, y: 0, w: LEN, h: THICK });
  if (!hasLeft)   arms.push({ x: 0, y: 0, w: THICK, h: LEN });
  
  // Top-right corner
  if (!hasTop)    arms.push({ x: 64 - LEN, y: 0, w: LEN, h: THICK });
  if (!hasRight)  arms.push({ x: 64 - THICK, y: 0, w: THICK, h: LEN });
  
  // Bottom-right corner
  if (!hasBottom) arms.push({ x: 64 - LEN, y: 64 - THICK, w: LEN, h: THICK });
  if (!hasRight)  arms.push({ x: 64 - THICK, y: 64 - LEN, w: THICK, h: LEN });
  
  // Bottom-left corner
  if (!hasBottom) arms.push({ x: 0, y: 64 - THICK, w: LEN, h: THICK });
  if (!hasLeft)   arms.push({ x: 0, y: 64 - LEN, w: THICK, h: LEN });

  const rects = arms.map(a => 
    `    <rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="1" fill="${color}" fill-opacity="${opacity}" />`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
${rects}
  </g>
</svg>`;
}

// Generate mask overlays (16 masks × 4 types = 64 files)
for (let mask = 0; mask < 16; mask++) {
  const hex = mask.toString(16).toUpperCase();
  for (const [type, style] of Object.entries(types)) {
    const svg = makeMaskSvg(mask, style.color, style.opacity);
    fs.writeFileSync(path.join(outDir, `${type}-mask${hex}.svg`), svg);
  }
}

// tile-hover.svg — full corner brackets for single-tile hover
const hoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="0" y="0" width="12" height="4" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="0" y="0" width="4" height="12" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="52" y="0" width="12" height="4" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="60" y="0" width="4" height="12" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="52" y="60" width="12" height="4" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="60" y="52" width="4" height="12" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="0" y="60" width="12" height="4" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
    <rect x="0" y="52" width="4" height="12" rx="1" fill="#e8dcc5" fill-opacity="0.80"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-hover.svg'), hoverSvg);

// tile-selected.svg — golden glow border for unit selection
const selectedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="2" y="2" width="60" height="60" rx="3" fill="none" stroke="#f4c430" stroke-width="2" stroke-opacity="0.9" filter="url(#glow)"/>
    <rect x="4" y="4" width="56" height="56" rx="2" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.5"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-selected.svg'), selectedSvg);

// tile-provoke.svg — amber dashed chain border
const provokeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="2" y="2" width="60" height="60" rx="3" fill="none" stroke="#f4c430" stroke-width="3" stroke-opacity="0.85" stroke-dasharray="6 4"/>
    <rect x="5" y="5" width="54" height="54" rx="2" fill="none" stroke="#f4c430" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="3 2"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-provoke.svg'), provokeSvg);

// tile-target.svg — red crosshair target indicator
const targetSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <!-- Crosshair lines -->
    <line x1="32" y1="8" x2="32" y2="24" stroke="#e85d4e" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
    <line x1="32" y1="40" x2="32" y2="56" stroke="#e85d4e" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
    <line x1="8" y1="32" x2="24" y2="32" stroke="#e85d4e" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
    <line x1="40" y1="32" x2="56" y2="32" stroke="#e85d4e" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
    <!-- Center circles -->
    <circle cx="32" cy="32" r="8" fill="none" stroke="#e85d4e" stroke-width="2" filter="url(#glow)"/>
    <circle cx="32" cy="32" r="3" fill="#e85d4e" fill-opacity="0.8"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-target.svg'), targetSvg);

// tile-path-move.svg — white directional arrow (pointing up/north, engine rotates as needed)
const pathMoveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <polygon points="32,8 44,28 36,28 36,52 28,52 28,28 20,28" fill="#e8dcc5" fill-opacity="0.90"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-path-move.svg'), pathMoveSvg);

// tile-path-attack.svg — red directional arrow
const pathAttackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <polygon points="32,8 44,28 36,28 36,52 28,52 28,28 20,28" fill="#e85d4e" fill-opacity="0.90"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(outDir, 'tile-path-attack.svg'), pathAttackSvg);

console.log(`Generated 70 overlay SVGs in ${outDir}`);
