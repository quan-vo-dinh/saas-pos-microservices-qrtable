#!/usr/bin/env node
/**
 * Generate Chapter 2 .excalidraw with embedded SVG/PNG icons (not text emoji).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../assets/diagrams');
const ICON_DIR = join(OUT_DIR, 'chapter2-icons');

let seed = 1;
const id = () => `ch2_${(seed++).toString(36)}`;

const fileRegistry = new Map();

function loadIconDataUrl(filename) {
  const path = join(ICON_DIR, filename);
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const ext = basename(filename).split('.').pop()?.toLowerCase();
  const mime =
    ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function registerFile(filename) {
  const dataURL = loadIconDataUrl(filename);
  if (!dataURL) return null;
  const fileId = `file_${basename(filename, '.' + filename.split('.').pop())}`;
  if (!fileRegistry.has(fileId)) {
    const now = Date.now();
    fileRegistry.set(fileId, {
      mimeType: dataURL.startsWith('data:image/png') ? 'image/png' : 'image/svg+xml',
      id: fileId,
      dataURL,
      created: now,
      lastRetrieved: now,
    });
  }
  return fileId;
}

function baseElement(type, partial) {
  const elementId = partial.id ?? id();
  return {
    id: elementId,
    type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: '#334155',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: Math.floor(Math.random() * 2 ** 31),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    ...partial,
    id: elementId,
  };
}

function box(x, y, w, h, label, bg = '#e0f2fe') {
  const rect = baseElement('rectangle', {
    x,
    y,
    width: w,
    height: h,
    backgroundColor: bg,
    strokeColor: '#0369a1',
  });
  const text = baseElement('text', {
    x: x + 8,
    y: y + h / 2 - 10,
    width: w - 16,
    height: 24,
    text: label,
    fontSize: 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: rect.id,
    originalText: label,
    lineHeight: 1.25,
    strokeColor: '#0f172a',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
  });
  rect.boundElements = [{ type: 'text', id: text.id }];
  return [rect, text];
}

function title(x, y, text) {
  return baseElement('text', {
    x,
    y,
    width: 700,
    height: 28,
    text,
    fontSize: 20,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    originalText: text,
    lineHeight: 1.25,
    strokeColor: '#0f172a',
    backgroundColor: 'transparent',
  });
}

function arrow(x1, y1, x2, y2) {
  return baseElement('arrow', {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    startArrowhead: null,
    endArrowhead: 'arrow',
    strokeColor: '#475569',
  });
}

/** Embed raster/vector icon as Excalidraw image element */
function icon(x, y, size, iconFile) {
  const fileId = registerFile(iconFile);
  if (!fileId) return [];
  return [
    baseElement('image', {
      x,
      y,
      width: size,
      height: size,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      roundness: null,
      boundElements: null,
      status: 'saved',
      fileId,
      scale: [1, 1],
    }),
  ];
}

function wrap(elements) {
  const files = Object.fromEntries(fileRegistry.entries());
  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements,
    appState: {
      viewBackgroundColor: '#ffffff',
      gridSize: 20,
      exportBackground: true,
      exportWithDarkMode: false,
    },
    files,
  };
}

function diagramFnbPosLifecycle() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.1 — Vòng đời vận hành POS F&B (khái niệm)'));
  els.push(...icon(40, 72, 48, 'fnb-delivery.svg'));
  const nodes = [
    ['Bàn / khu vực', 110, 80, 130, 56],
    ['Order\n(nhiều lần)', 270, 80, 130, 56],
    ['Bếp / Bar', 430, 80, 130, 56],
    ['Bill', 590, 80, 110, 56],
    ['Thanh toán', 730, 80, 130, 56],
  ];
  for (const [t, x, y, w, h] of nodes) {
    els.push(...box(x, y, w, h, t));
  }
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    els.push(arrow(a[1] + a[3], a[2] + a[4] / 2, b[1], b[2] + b[4] / 2));
  }
  els.push(...box(40, 200, 200, 48, 'Nhánh nhân viên / POS', '#fef3c7'));
  els.push(...box(280, 200, 220, 48, 'Nhánh khách QR', '#dcfce7'));
  els.push(...icon(300, 192, 36, 'scan-qr.svg'));
  return wrap(els);
}

function diagramQrOrderingFlow() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.2 — Luồng QR ordering (khái niệm)'));
  els.push(...icon(40, 62, 52, 'scan-qr.svg'));
  const steps = [
    ['Quét QR', 110, 70],
    ['Xác thực\ntoken/bàn', 260, 70],
    ['Session', 410, 70],
    ['Menu', 530, 70],
    ['Giỏ chung', 650, 70],
    ['Submit', 790, 70],
  ];
  const w = 120;
  const h = 64;
  for (const [t, x, y] of steps) {
    els.push(...box(x, y, w, h, t, '#ecfdf5'));
  }
  for (let i = 0; i < steps.length - 1; i++) {
    els.push(arrow(steps[i][1] + w, steps[i][2] + h / 2, steps[i + 1][1], steps[i + 1][2] + h / 2));
  }
  els.push(...icon(720, 62, 40, 'redis.svg'));
  return wrap(els);
}

function diagramSaasMultitenancy() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.3 — SaaS multi-tenancy (khái niệm)'));
  els.push(...icon(300, 42, 44, 'cloud.svg'));
  els.push(...box(200, 50, 400, 50, 'Nền tảng SaaS dùng chung (app + hạ tầng)', '#f1f5f9'));
  els.push(...box(80, 140, 200, 56, 'Tenant A', '#dbeafe'));
  els.push(...box(360, 140, 200, 56, 'Tenant B', '#dbeafe'));
  els.push(...box(640, 140, 200, 56, 'Tenant C', '#dbeafe'));
  els.push(
    ...box(60, 240, 780, 110, 'Ranh giới cô lập: API · DB (tenant_id) · cache · event · realtime', '#fff7ed'),
  );
  els.push(...icon(90, 255, 36, 'postgresql.svg'));
  els.push(...icon(400, 255, 36, 'redis.svg'));
  els.push(arrow(180, 196, 180, 240));
  els.push(arrow(460, 196, 460, 240));
  els.push(arrow(740, 196, 740, 240));
  return wrap(els);
}

function diagramMonolithVsMicroservices() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.4 — Monolith vs microservices (khái niệm)'));
  els.push(...box(40, 80, 320, 160, 'Monolith\nUI + business logic', '#fee2e2'));
  els.push(...box(120, 260, 160, 56, 'Một database', '#fecaca'));
  els.push(...icon(160, 268, 40, 'postgresql.svg'));
  els.push(arrow(200, 240, 200, 260));
  els.push(...icon(440, 72, 40, 'docker.svg'));
  const services = [
    ['Catalog', 440, 100],
    ['Order', 580, 100],
    ['Payment', 720, 100],
    ['Kitchen', 440, 180],
    ['SaaS', 580, 180],
  ];
  for (const [t, x, y] of services) {
    els.push(...box(x, y, 120, 48, t, '#dcfce7'));
    els.push(...box(x, y + 58, 120, 36, 'DB', '#bbf7d0'));
    els.push(arrow(x + 60, y + 48, x + 60, y + 58));
  }
  return wrap(els);
}

function diagramKafkaEventFlow() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.5 — Event-driven / Kafka (khái niệm)'));
  els.push(...icon(700, 55, 72, 'kafka.svg'));
  els.push(...box(40, 90, 140, 56, 'Producer', '#fef9c3'));
  els.push(...box(220, 70, 200, 96, 'Topic\nPartitions', '#e0e7ff'));
  els.push(...box(480, 60, 180, 56, 'Consumer\nGroup A', '#dcfce7'));
  els.push(...box(480, 150, 180, 56, 'Consumer\nGroup B', '#dcfce7'));
  els.push(arrow(180, 118, 220, 118));
  els.push(arrow(420, 100, 480, 88));
  els.push(arrow(420, 130, 480, 178));
  return wrap(els);
}

function diagramOutboxSaga() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.6 — Outbox & saga (khái niệm)'));
  els.push(...icon(40, 72, 36, 'postgresql.svg'));
  els.push(...box(40, 80, 160, 48, 'Business TX', '#dbeafe'));
  els.push(...box(40, 150, 160, 48, 'Outbox', '#dbeafe'));
  els.push(...box(240, 150, 140, 48, 'Publisher', '#e0e7ff'));
  els.push(...box(420, 150, 120, 48, 'Broker', '#fef9c3'));
  els.push(...icon(450, 158, 32, 'kafka.svg'));
  els.push(arrow(120, 128, 120, 150));
  els.push(arrow(200, 174, 240, 174));
  els.push(arrow(380, 174, 420, 174));
  els.push(...box(40, 270, 100, 44, 'Bước 1', '#dcfce7'));
  els.push(...box(160, 270, 100, 44, 'Bước 2', '#dcfce7'));
  els.push(...box(280, 270, 100, 44, 'Bước 3', '#dcfce7'));
  els.push(...box(400, 320, 140, 44, 'Compensate', '#fee2e2'));
  els.push(arrow(140, 292, 160, 292));
  els.push(arrow(260, 292, 280, 292));
  els.push(arrow(330, 314, 400, 342));
  return wrap(els);
}

function diagramWebsocketHintRefetch() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.7 — WebSocket hint/refetch (khái niệm)'));
  els.push(...box(40, 100, 120, 56, 'Client UI', '#e0f2fe'));
  els.push(...box(220, 60, 160, 48, 'WebSocket\nhint', '#fef3c7'));
  els.push(...box(220, 150, 160, 48, 'REST API', '#dcfce7'));
  els.push(...box(440, 120, 200, 56, 'Service + DB\nsource of truth', '#bbf7d0'));
  els.push(...icon(250, 52, 40, 'websocket.svg'));
  els.push(...icon(250, 142, 40, 'nginx.svg'));
  els.push(...icon(500, 128, 40, 'postgresql.svg'));
  els.push(arrow(160, 120, 220, 84));
  els.push(arrow(160, 140, 220, 174));
  els.push(arrow(380, 174, 440, 148));
  return wrap(els);
}

function diagramOidcRbac() {
  const els = [];
  els.push(title(20, 12, 'Hình 2.8 — Auth staff vs customer session (khái niệm)'));
  els.push(...icon(40, 72, 44, 'keycloak.svg'));
  els.push(...icon(40, 192, 40, 'scan-qr.svg'));
  els.push(...box(40, 80, 100, 44, 'IdP OIDC', '#e0e7ff'));
  els.push(...box(160, 80, 90, 44, 'JWT', '#fef3c7'));
  els.push(...box(270, 80, 90, 44, 'RBAC', '#dcfce7'));
  els.push(...box(380, 80, 120, 44, 'API tenant', '#dbeafe'));
  els.push(...icon(100, 88, 28, 'openid.svg'));
  els.push(arrow(140, 102, 160, 102));
  els.push(arrow(250, 102, 270, 102));
  els.push(arrow(360, 102, 380, 102));
  els.push(...box(40, 210, 90, 44, 'QR', '#ecfdf5'));
  els.push(...box(150, 210, 110, 44, 'Session', '#ecfdf5'));
  els.push(...box(280, 210, 120, 44, 'API scoped', '#dbeafe'));
  els.push(arrow(130, 232, 150, 232));
  els.push(arrow(260, 232, 280, 232));
  return wrap(els);
}

const DIAGRAMS = [
  ['chapter2-fnb-pos-lifecycle', diagramFnbPosLifecycle],
  ['chapter2-qr-ordering-flow', diagramQrOrderingFlow],
  ['chapter2-saas-multitenancy', diagramSaasMultitenancy],
  ['chapter2-monolith-vs-microservices', diagramMonolithVsMicroservices],
  ['chapter2-kafka-event-flow', diagramKafkaEventFlow],
  ['chapter2-outbox-saga-overview', diagramOutboxSaga],
  ['chapter2-websocket-hint-refetch', diagramWebsocketHintRefetch],
  ['chapter2-oidc-rbac-saas-pos', diagramOidcRbac],
];

mkdirSync(ICON_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const [name, fn] of DIAGRAMS) {
  fileRegistry.clear();
  const doc = fn();
  const path = join(OUT_DIR, `${name}.excalidraw`);
  writeFileSync(path, JSON.stringify(doc, null, 2), 'utf8');
  const fileCount = Object.keys(doc.files ?? {}).length;
  console.log(`Wrote ${path} (${fileCount} embedded icons)`);
}
