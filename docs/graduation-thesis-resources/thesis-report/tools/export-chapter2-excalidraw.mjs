#!/usr/bin/env node
/**
 * Export chapter2 *.excalidraw → SVG (supports embedded image files).
 * Lightweight renderer — avoids @excalidraw/utils Node 24 JSON import issues.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIAGRAMS_DIR = join(ROOT, 'assets/diagrams');
const FIGURES_DIR = join(ROOT, 'assets/figures');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bounds(elements) {
  const padding = 40;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.isDeleted) continue;
    const x1 = el.x ?? 0;
    const y1 = el.y ?? 0;
    const x2 = x1 + (el.width ?? 0);
    const y2 = y1 + (el.height ?? 0);
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, width: 900, height: 400 };
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function renderElement(el, files, textByContainer) {
  if (el.isDeleted) return '';
  const type = el.type;

  if (type === 'rectangle') {
    const label = textByContainer.get(el.id);
    const rx = el.roundness?.type ? 8 : 0;
    let svg = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="${el.backgroundColor ?? '#fff'}" stroke="${el.strokeColor ?? '#333'}" stroke-width="${el.strokeWidth ?? 2}"/>`;
    if (label) {
      const lines = label.text.split('\n');
      const lineHeight = (label.fontSize ?? 16) * 1.25;
      const startY = el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        svg += `<text x="${el.x + el.width / 2}" y="${startY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${label.fontSize ?? 16}" fill="${label.strokeColor ?? '#0f172a'}">${escapeXml(line)}</text>`;
      });
    }
    return svg;
  }

  if (type === 'text' && !el.containerId) {
    return `<text x="${el.x}" y="${el.y + (el.fontSize ?? 16)}" font-family="Arial,sans-serif" font-size="${el.fontSize ?? 16}" fill="${el.strokeColor ?? '#0f172a'}">${escapeXml(el.text ?? '')}</text>`;
  }

  if (type === 'arrow') {
    const x1 = el.x;
    const y1 = el.y;
    const x2 = el.x + (el.width ?? 0);
    const y2 = el.y + (el.height ?? 0);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const head = 10;
    const ax = x2 - ux * head;
    const ay = y2 - uy * head;
    const px = -uy;
    const py = ux;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${el.strokeColor ?? '#475569'}" stroke-width="2" marker-end="url(#arrowhead)"/>
<polygon points="${x2},${y2} ${ax + px * 4},${ay + py * 4} ${ax - px * 4},${ay - py * 4}" fill="${el.strokeColor ?? '#475569'}"/>`;
  }

  if (type === 'image' && el.fileId && files[el.fileId]?.dataURL) {
    const href = files[el.fileId].dataURL;
    return `<image href="${href}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return '';
}

function toSvg(doc) {
  const elements = doc.elements ?? [];
  const files = doc.files ?? {};
  const textByContainer = new Map();
  for (const el of elements) {
    if (el.type === 'text' && el.containerId) {
      textByContainer.set(el.containerId, el);
    }
  }

  const { minX, minY, width, height } = bounds(elements);
  const body = elements.map((el) => renderElement(el, files, textByContainer)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0 0, 8 4, 0 8" fill="#475569"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="${doc.appState?.viewBackgroundColor ?? '#ffffff'}"/>
  <g transform="translate(${-minX}, ${-minY})">
  ${body}
  </g>
</svg>`;
}

mkdirSync(FIGURES_DIR, { recursive: true });

const names = readdirSync(DIAGRAMS_DIR).filter(
  (f) => f.startsWith('chapter2-') && f.endsWith('.excalidraw'),
);

for (const filename of names.sort()) {
  const base = basename(filename, '.excalidraw');
  const raw = JSON.parse(readFileSync(join(DIAGRAMS_DIR, filename), 'utf8'));
  const svg = toSvg(raw);
  const svgPath = join(FIGURES_DIR, `${base}.svg`);
  writeFileSync(svgPath, svg, 'utf8');
  const iconCount = Object.keys(raw.files ?? {}).length;
  console.log(`SVG: ${svgPath} (${iconCount} embedded images)`);
}
