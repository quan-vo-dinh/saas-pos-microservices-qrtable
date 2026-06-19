import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const {
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  BookOpenCheck,
  Boxes,
  Building2,
  Cable,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Database,
  DatabaseBackup,
  DatabaseZap,
  FileSearch,
  Gauge,
  GitBranch,
  KeyRound,
  Layers3,
  Link2,
  ListChecks,
  LockKeyhole,
  Logs,
  MessageSquareMore,
  MonitorSmartphone,
  MousePointerClick,
  Network,
  Presentation,
  QrCode,
  RadioTower,
  ReceiptText,
  RefreshCw,
  Repeat2,
  Route,
  Scale,
  ScanLine,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Table2,
  TestTube2,
  UserCog,
  Users,
  Utensils,
  WalletCards,
  Webhook,
  Wifi,
  Workflow,
} = require('lucide-react');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const deckRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(deckRoot, '../../..');
const outputDir = path.join(deckRoot, 'output');
const pptxPath = path.join(outputDir, 'qrtable-defense-deck.pptx');
const registryPath = path.join(outputDir, 'asset-registry.json');

const W = 13.333;
const H = 7.5;

const C = {
  bg: '09090B',
  surface: '18181B',
  surfaceAlt: '111114',
  surfaceBlue: '0B1320',
  border: '27272A',
  borderStrong: '3F3F46',
  text: 'FAFAFA',
  muted: 'A1A1AA',
  dim: '71717A',
  cyan: '22D3EE',
  emerald: '34D399',
  amber: 'FBBF24',
  rose: 'FB7185',
  white: 'FFFFFF',
};

const FONT = {
  sans: 'Avenir Next',
  mono: 'Menlo',
};

const thesis = {
  title:
    'Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc vi dịch vụ',
  author: 'Võ Đình Minh Quân',
  studentId: '22521193',
  faculty: 'Khoa Hệ thống Thông tin',
  major: 'Hệ thống Thông tin',
  supervisor: 'TS. Nguyễn Thanh Bình',
  year: '2026',
};

const rel = (p) => path.relative(repoRoot, path.resolve(repoRoot, p));
const existing = (p) => {
  const absolute = path.resolve(repoRoot, p);
  return fs.existsSync(absolute) ? absolute : null;
};
const fileUrl = (p) => pathToFileURL(path.resolve(repoRoot, p)).href;

const assets = {
  schoolLogo: {
    id: 'GLOBAL_SCHOOL_LOGO',
    type: 'logo',
    path: null,
    status: 'user-replacement',
    purpose: 'Nhận diện chính thức của Trường Đại học Công nghệ Thông tin ở footer',
    requiredContent: ['Logo UIT chính thức'],
    sourceLinks: ['Asset chính thức do người dùng cung cấp hoặc nguồn trường đã kiểm chứng'],
    replacementOwner: 'user',
    replacementInstructions:
      'Thay biểu trưng trung tính trong footer bằng logo UIT chính thức; giữ nguyên tỉ lệ và màu theo guideline.',
    aspectRatio: 'preserve',
    caption: 'Logo trường',
  },
  schoolNameText: {
    id: 'GLOBAL_SCHOOL_NAME_TEXT',
    type: 'text',
    path: null,
    status: 'ready',
    purpose: 'Tên trường là text độc lập cạnh logo trong footer',
    requiredContent: ['TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN'],
    sourceLinks: [rel('docs/graduation-thesis-resources/thesis-report/frontmatter/cover.tex')],
    replacementOwner: 'agent',
    replacementInstructions: 'Giữ dưới dạng text box, không rasterize chung với logo.',
    aspectRatio: 'inline',
    caption: 'Tên đơn vị đào tạo',
  },
  coverBackground: {
    id: 'GLOBAL_COVER_BACKGROUND',
    type: 'photo',
    path: rel('apps/management-app/public/landing-hero-ambient.png'),
    status: 'prototype',
    purpose: 'Ảnh nền cho bìa và slide kết luận',
    requiredContent: ['Ảnh F&B hoặc hình ảnh QRTable phù hợp', 'Vùng tối đủ cho typography lớn'],
    sourceLinks: [rel('apps/management-app/public/landing-hero-ambient.png')],
    replacementOwner: 'user',
    replacementInstructions:
      'Có thể thay bằng ảnh F&B/QRTable khác; giữ tỉ lệ 16:9, overlay tối và kiểm tra quyền sử dụng.',
    aspectRatio: '16:9-cover',
    caption: 'Ảnh nền bìa',
  },
  architectureOverview: {
    id: 'SLIDE_ARCHITECTURE_OVERVIEW',
    type: 'diagram',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh họa kiến trúc tổng thể và kênh giao tiếp của QRTable',
    requiredContent: [
      'Customer PWA và Management App',
      'BFF',
      'Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access',
      'TCP, gRPC, Kafka và WebSocket',
      'Redis, PostgreSQL và MongoDB theo owner',
    ],
    sourceLinks: [
      rel('docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter4-overall-architecture.mmd'),
      rel('docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-overall-architecture.pdf'),
      rel('docs/technical-architecture.md'),
    ],
    replacementOwner: 'user',
    replacementInstructions:
      'Vẽ sơ đồ kiến trúc tổng thể theo Academic Dark, ưu tiên ranh giới và kênh giao tiếp; không biến thành logo gallery.',
    aspectRatio: 'wide',
    caption: 'Kiến trúc tổng thể QRTable theo ranh giới dịch vụ',
  },
  serviceOwnership: {
    id: 'SLIDE_SERVICE_DATA_OWNERSHIP',
    type: 'diagram',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh họa quyền sở hữu dữ liệu theo dịch vụ và cấm truy cập CSDL chéo',
    requiredContent: [
      'Catalog sở hữu menu, table, QR và stock',
      'Order sở hữu session, cart, order và bill',
      'Kitchen sở hữu Redis projection khi vận hành',
      'Payment sở hữu payment transaction và settings',
      'SaaS và User-Access sở hữu domain riêng',
    ],
    sourceLinks: [
      rel('docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex'),
      rel('docs/DOC-CODE-ANCHORS.md'),
    ],
    replacementOwner: 'user',
    replacementInstructions:
      'Vẽ ownership map; không vẽ foreign key hoặc direct database access xuyên service.',
    aspectRatio: 'wide',
    caption: 'Ranh giới dịch vụ và quyền sở hữu dữ liệu',
  },
  orderConfirmSaga: {
    id: 'SLIDE_ORDER_CONFIRM_SAGA',
    type: 'diagram',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh họa luồng thành công, nhánh lỗi và bù trừ của Order Confirm Saga',
    requiredContent: [
      'Order khóa đơn PENDING và kiểm tra hóa đơn OPEN',
      'Catalog trừ tồn kho qua TCP',
      'Order ghi PROCESSING cùng outbox order.confirmed',
      'Catalog hoàn tồn kho nếu Order commit hoặc outbox thất bại',
      'Biên idempotency cho xác nhận và bù trừ',
    ],
    sourceLinks: [
      rel('docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter5-order-confirm-stock.mmd'),
      rel('docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf'),
      rel('docs/testing/phase-5/saga-validation-strategy.md'),
      rel('apps/order/src/app/modules/order/services/order-confirm-saga.service.ts'),
    ],
    replacementOwner: 'user',
    replacementInstructions:
      'Thay vùng visual bằng sequence/state diagram riêng; giữ đủ happy path, lỗi sau deduct, compensation và idempotency.',
    aspectRatio: 'wide',
    caption: 'Order Confirm Saga và nhánh bù trừ',
  },
  goldenFlowScreens: {
    id: 'SLIDE_GOLDEN_FLOW_SCREENSHOTS',
    type: 'screenshot',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh họa UI demo QR -> Cart -> Order -> KDS -> Payment',
    requiredContent: [
      'Customer PWA menu/cart',
      'POS xác nhận đơn',
      'KDS ticket',
      'Payment hoặc bill state',
      'Annotation actor và trạng thái',
    ],
    sourceLinks: [
      rel('apps/management-app/public/landing-pwa-customer-menu.png'),
      rel('apps/management-app/public/landing-dashboard-pos-live-orders.png'),
      rel('docs/graduation-thesis-resources/thesis-phase5d-screenshot-scaffold.md'),
    ],
    replacementOwner: 'user',
    replacementInstructions:
      'Thay bằng ảnh demo thật, crop rõ trạng thái chính, che dữ liệu nhạy cảm và giữ tỉ lệ vùng visual.',
    aspectRatio: 'wide',
    caption: 'Golden flow demo của QRTable',
  },
  dbStateEvidence: {
    id: 'APPENDIX_DB_STATE_EVIDENCE',
    type: 'database-state',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh chứng trạng thái Order, Bill/Payment, KDS hoặc outbox sau demo',
    requiredContent: ['Ít dòng dữ liệu', 'Highlight state', 'Che tenantId/token/secret nếu cần'],
    sourceLinks: [
      rel('apps/order/src/app/modules/order/tests/order-payment-finalization.integration.spec.ts'),
      rel('docs/testing/phase-5/traceability-matrix.md'),
    ],
    replacementOwner: 'user',
    replacementInstructions: 'Chụp query DB/Redis thật; giữ ít dòng và đánh dấu trạng thái cần chứng minh.',
    aspectRatio: 'wide',
    caption: 'Trạng thái dữ liệu sau luồng demo',
  },
  logTraceEvidence: {
    id: 'APPENDIX_LOG_TRACE_EVIDENCE',
    type: 'log',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh chứng đường đi liên dịch vụ, event và correlation',
    requiredContent: ['BFF -> Order -> Catalog hoặc Payment -> Order', 'Correlation/process id', 'Không lộ secret'],
    sourceLinks: [rel('libs/observability'), rel('docker-compose.monitoring.yaml')],
    replacementOwner: 'user',
    replacementInstructions: 'Thay bằng log/trace thật, chỉ giữ vài dòng hoặc span có ý nghĩa.',
    aspectRatio: 'wide',
    caption: 'Log hoặc trace của luồng liên dịch vụ',
  },
  testOutputEvidence: {
    id: 'APPENDIX_TEST_OUTPUT_EVIDENCE',
    type: 'test-output',
    path: null,
    status: 'user-replacement',
    purpose: 'Minh chứng kiểm thử cho Saga, KDS, payment bridge và guard',
    requiredContent: ['Command', 'Suite', 'Kết quả pass', 'Invariant được kiểm chứng'],
    sourceLinks: [
      rel('docs/graduation-thesis-resources/thesis-report/assets/test-evidence/appendix-d-order-saga-tests.txt'),
      rel('docs/testing/phase-5/saga-validation-strategy.md'),
    ],
    replacementOwner: 'user',
    replacementInstructions: 'Thay bằng output terminal thật mới nhất; crop phần chứng minh invariant.',
    aspectRatio: 'wide',
    caption: 'Kết quả kiểm thử tự động',
  },
};

function svgData(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function gradientStripData() {
  return svgData(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="8" viewBox="0 0 1280 8">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#22D3EE"/>
          <stop offset="1" stop-color="#34D399"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="8" fill="url(#g)"/>
    </svg>
  `);
}

async function iconData(Icon, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Icon, { color: `#${color}`, size: 256, strokeWidth: 2 }),
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `image/png;base64,${png.toString('base64')}`;
}

function addBackground(slide, { photo = false } = {}) {
  slide.background = { color: C.bg };
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: { color: C.bg },
    line: { color: C.bg },
  });
  if (photo) {
    const imagePath = existing(assets.coverBackground.path);
    if (imagePath) {
      slide.addImage({ path: imagePath, x: 0, y: 0, w: W, h: H, transparency: 5 });
      slide.addShape('rect', {
        x: 0,
        y: 0,
        w: W,
        h: H,
        fill: { color: C.bg, transparency: 18 },
        line: { color: C.bg, transparency: 100 },
      });
      slide.addShape('rect', {
        x: 0,
        y: 0,
        w: 8.9,
        h: H,
        fill: { color: C.bg, transparency: 8 },
        line: { color: C.bg, transparency: 100 },
      });
    }
  }
  slide.addImage({ data: gradientStripData(), x: 0, y: 7.415, w: W, h: 0.085 });
}

function addSchoolFooter(slide, code) {
  const x = 0.72;
  const y = 6.96;
  slide.addShape('rect', {
    x,
    y,
    w: 0.26,
    h: 0.26,
    fill: { color: C.surfaceAlt },
    line: { color: C.borderStrong, width: 0.7 },
  });
  const sq = 0.055;
  [
    [x + 0.055, y + 0.055],
    [x + 0.15, y + 0.055],
    [x + 0.055, y + 0.15],
    [x + 0.15, y + 0.15],
  ].forEach(([sx, sy]) => {
    slide.addShape('rect', {
      x: sx,
      y: sy,
      w: sq,
      h: sq,
      fill: { color: C.cyan },
      line: { color: C.cyan },
    });
  });
  slide.addText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN', {
    x: 1.08,
    y: 6.995,
    w: 3.55,
    h: 0.12,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 7.2,
    color: C.muted,
    bold: true,
  });
  slide.addText('ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH', {
    x: 1.08,
    y: 7.12,
    w: 3.55,
    h: 0.1,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 6.3,
    color: C.dim,
  });
  slide.addText(code, {
    x: 10.05,
    y: 7.06,
    w: 2.5,
    h: 0.15,
    margin: 0,
    fontFace: FONT.mono,
    fontSize: 8,
    color: C.muted,
    align: 'right',
  });
}

function addHeader(slide, section, title, subtitle, opts = {}) {
  slide.addText(section.toUpperCase(), {
    x: 0.83,
    y: opts.sectionY ?? 0.58,
    w: 10.2,
    h: 0.22,
    margin: 0,
    fontFace: FONT.mono,
    fontSize: 11,
    color: C.cyan,
    bold: true,
    charSpacing: 1.6,
  });
  slide.addText(title, {
    x: 0.83,
    y: opts.titleY ?? 1.06,
    w: opts.titleW ?? 11.7,
    h: opts.titleH ?? 0.62,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: opts.titleSize ?? 30.5,
    color: C.text,
    bold: true,
    fit: 'shrink',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.83,
      y: opts.subtitleY ?? 1.82,
      w: opts.subtitleW ?? 11.55,
      h: opts.subtitleH ?? 0.44,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: opts.subtitleSize ?? 16,
      color: C.muted,
      fit: 'shrink',
    });
  }
}

function addNotes(slide, notes) {
  slide.addNotes(notes.trim());
}

function addIcon(slide, icon, x, y, size) {
  slide.addImage({ data: icon, x, y, w: size, h: size });
}

function addCard(slide, x, y, w, h, { fill = C.surface, line = C.border } = {}) {
  slide.addShape('rect', {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: { color: line, width: 0.8 },
  });
}

function addIconCard(slide, item) {
  const { x, y, w, h, icon, color, title, body, tag } = item;
  addCard(slide, x, y, w, h);
  addIcon(slide, icon, x + 0.2, y + 0.2, 0.32);
  if (tag) {
    slide.addText(tag.toUpperCase(), {
      x: x + 0.7,
      y: y + 0.25,
      w: w - 0.92,
      h: 0.17,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 8.2,
      color,
      bold: true,
      charSpacing: 0.8,
    });
  }
  slide.addText(title, {
    x: x + 0.2,
    y: y + (tag ? 0.72 : 0.76),
    w: w - 0.4,
    h: 0.48,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: item.titleSize ?? 16.2,
    color: C.text,
    bold: true,
    fit: 'shrink',
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + (tag ? 1.22 : 1.35),
    w: w - 0.4,
    h: h - (tag ? 1.42 : 1.58),
    margin: 0,
    fontFace: FONT.sans,
    fontSize: item.bodySize ?? 11.8,
    color: C.muted,
    valign: 'top',
    fit: 'shrink',
  });
}

function addFourCards(slide, items, y = 2.72, h = 3.38) {
  const gap = 0.18;
  const w = (11.67 - gap * 3) / 4;
  items.forEach((item, i) => addIconCard(slide, { ...item, x: 0.83 + i * (w + gap), y, w, h }));
}

function addTwoColumns(slide, left, right, opts = {}) {
  const y = opts.y ?? 2.62;
  const h = opts.h ?? 3.75;
  addCard(slide, 0.83, y, 5.72, h);
  addCard(slide, 6.78, y, 5.72, h);
  [
    [left, 0.83, opts.leftColor ?? C.cyan],
    [right, 6.78, opts.rightColor ?? C.emerald],
  ].forEach(([data, x, color]) => {
    if (data.icon) addIcon(slide, data.icon, x + 0.25, y + 0.24, 0.36);
    slide.addText(data.title, {
      x: x + (data.icon ? 0.76 : 0.25),
      y: y + 0.25,
      w: data.icon ? 4.65 : 5.2,
      h: 0.35,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 17,
      color,
      bold: true,
      fit: 'shrink',
    });
    slide.addText(
      data.items.map((text) => ({ text, options: { bullet: { indent: 14 }, breakLine: true } })),
      {
        x: x + 0.25,
        y: y + 0.88,
        w: 5.15,
        h: h - 1.12,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: opts.bodySize ?? 12.2,
        color: C.muted,
        breakLine: false,
        paraSpaceAfterPt: 10,
        fit: 'shrink',
      },
    );
  });
}

function addFlow(slide, items, opts = {}) {
  const x = opts.x ?? 0.83;
  const y = opts.y ?? 2.8;
  const w = opts.w ?? 11.67;
  const h = opts.h ?? 2.55;
  const gap = opts.gap ?? 0.16;
  const boxW = (w - gap * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const bx = x + i * (boxW + gap);
    addCard(slide, bx, y, boxW, h, { fill: i === items.length - 1 ? C.surfaceBlue : C.surface });
    if (item.icon) addIcon(slide, item.icon, bx + 0.18, y + 0.18, 0.3);
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: bx + boxW - 0.48,
      y: y + 0.22,
      w: 0.28,
      h: 0.15,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 8,
      color: item.color ?? (i === items.length - 1 ? C.emerald : C.cyan),
      bold: true,
      align: 'right',
    });
    slide.addText(item.title, {
      x: bx + 0.18,
      y: y + 0.72,
      w: boxW - 0.36,
      h: 0.42,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: opts.titleSize ?? 14.8,
      color: C.text,
      bold: true,
      fit: 'shrink',
    });
    slide.addText(item.body, {
      x: bx + 0.18,
      y: y + 1.27,
      w: boxW - 0.36,
      h: h - 1.52,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: opts.bodySize ?? 10.8,
      color: C.muted,
      fit: 'shrink',
    });
    if (i < items.length - 1) {
      slide.addShape('line', {
        x: bx + boxW + 0.02,
        y: y + h / 2,
        w: gap - 0.04,
        h: 0,
        line: { color: C.cyan, width: 1.1, endArrowType: 'triangle', transparency: 20 },
      });
    }
  });
}

function addLargeDrivers(slide, items) {
  items.forEach((item, i) => {
    const x = 0.83 + i * 3.05;
    addIcon(slide, item.icon, x + 0.87, 2.66, 0.68);
    slide.addText(item.title, {
      x,
      y: 3.63,
      w: 2.42,
      h: 0.52,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 17.5,
      color: C.text,
      bold: true,
      align: 'center',
      fit: 'shrink',
    });
    slide.addText(item.body, {
      x,
      y: 4.34,
      w: 2.42,
      h: 1.34,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 11.8,
      color: C.muted,
      align: 'center',
      fit: 'shrink',
    });
  });
}

function addTable(slide, rows, opts = {}) {
  const x = opts.x ?? 0.83;
  const y = opts.y ?? 2.48;
  const w = opts.w ?? 11.67;
  const rowH = opts.rowH ?? 0.58;
  const weights = opts.weights ?? rows[0].map(() => 1);
  const total = weights.reduce((sum, value) => sum + value, 0);
  rows.forEach((row, r) => {
    let cx = x;
    row.forEach((cell, c) => {
      const cw = (w * weights[c]) / total;
      slide.addShape('rect', {
        x: cx,
        y: y + r * rowH,
        w: cw,
        h: rowH,
        fill: { color: r === 0 ? C.surfaceBlue : r % 2 === 0 ? C.surfaceAlt : C.surface },
        line: { color: C.border, width: 0.55 },
      });
      slide.addText(cell, {
        x: cx + 0.09,
        y: y + r * rowH + 0.1,
        w: cw - 0.18,
        h: rowH - 0.16,
        margin: 0,
        fontFace: r === 0 ? FONT.mono : FONT.sans,
        fontSize: r === 0 ? opts.headerSize ?? 8.7 : opts.bodySize ?? 9.3,
        color: r === 0 ? C.cyan : C.muted,
        bold: r === 0,
        fit: 'shrink',
        valign: 'mid',
      });
      cx += cw;
    });
  });
}

function addCleanPlaceholder(slide, asset, opts = {}) {
  const x = opts.x ?? 0.83;
  const y = opts.y ?? 2.55;
  const w = opts.w ?? 8.2;
  const h = opts.h ?? 3.9;
  addCard(slide, x, y, w, h, { fill: C.surfaceAlt, line: C.borderStrong });
  if (opts.icon) addIcon(slide, opts.icon, x + w / 2 - 0.42, y + 0.72, 0.84);
  slide.addText(asset.caption, {
    x: x + 0.55,
    y: y + 1.78,
    w: w - 1.1,
    h: 0.45,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 18,
    color: C.text,
    bold: true,
    align: 'center',
    fit: 'shrink',
  });
  slide.addText(opts.description ?? asset.purpose, {
    x: x + 0.65,
    y: y + 2.42,
    w: w - 1.3,
    h: 0.58,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 11.2,
    color: C.muted,
    align: 'center',
    fit: 'shrink',
  });
  if (opts.chips) {
    const chipGap = 0.18;
    const chipW = (w - 1.0 - chipGap * (opts.chips.length - 1)) / opts.chips.length;
    opts.chips.forEach((chip, i) => {
      const cx = x + 0.5 + i * (chipW + chipGap);
      slide.addShape('rect', {
        x: cx,
        y: y + h - 0.82,
        w: chipW,
        h: 0.34,
        fill: { color: chip.color, transparency: 88 },
        line: { color: chip.color, transparency: 25, width: 0.7 },
      });
      slide.addText(chip.label, {
        x: cx + 0.05,
        y: y + h - 0.73,
        w: chipW - 0.1,
        h: 0.14,
        margin: 0,
        fontFace: FONT.mono,
        fontSize: 7.3,
        color: chip.color,
        bold: true,
        align: 'center',
        fit: 'shrink',
      });
    });
  }
  const firstSource = asset.sourceLinks?.[0];
  if (firstSource) {
    slide.addText(opts.linkLabel ?? 'Mở nguồn tham chiếu', {
      x: x + 0.35,
      y: y + h - 0.28,
      w: 2.7,
      h: 0.14,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 8,
      color: C.dim,
      hyperlink: { url: fileUrl(firstSource), tooltip: firstSource },
    });
  }
}

function baseSlide(pptx, { section, title, subtitle, code, photo = false, header = true }) {
  const slide = pptx.addSlide();
  addBackground(slide, { photo });
  if (header) addHeader(slide, section, title, subtitle);
  addSchoolFooter(slide, code);
  return slide;
}

function addCallout(slide, text, color = C.cyan, y = 6.32) {
  slide.addText(text, {
    x: 1.05,
    y,
    w: 11.2,
    h: 0.35,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 12.5,
    color,
    bold: true,
    align: 'center',
    fit: 'shrink',
  });
}

async function buildDeck() {
  fs.mkdirSync(outputDir, { recursive: true });

  const I = {};
  const iconSpecs = {
    alert: [AlertTriangle, C.rose],
    arrows: [ArrowRightLeft, C.cyan],
    bell: [BellRing, C.amber],
    book: [BookOpenCheck, C.cyan],
    boxes: [Boxes, C.emerald],
    building: [Building2, C.cyan],
    cable: [Cable, C.cyan],
    check: [CheckCircle2, C.emerald],
    chef: [ChefHat, C.amber],
    clipboard: [ClipboardCheck, C.emerald],
    credit: [CreditCard, C.emerald],
    database: [Database, C.emerald],
    dbBackup: [DatabaseBackup, C.cyan],
    databaseZap: [DatabaseZap, C.amber],
    evidence: [FileSearch, C.cyan],
    gauge: [Gauge, C.amber],
    git: [GitBranch, C.rose],
    key: [KeyRound, C.rose],
    layers: [Layers3, C.cyan],
    link: [Link2, C.emerald],
    list: [ListChecks, C.emerald],
    lock: [LockKeyhole, C.rose],
    logs: [Logs, C.amber],
    message: [MessageSquareMore, C.cyan],
    monitor: [MonitorSmartphone, C.cyan],
    mouse: [MousePointerClick, C.cyan],
    network: [Network, C.cyan],
    presentation: [Presentation, C.cyan],
    qr: [QrCode, C.cyan],
    radio: [RadioTower, C.emerald],
    receipt: [ReceiptText, C.emerald],
    refresh: [RefreshCw, C.rose],
    repeat: [Repeat2, C.amber],
    route: [Route, C.cyan],
    scale: [Scale, C.amber],
    scan: [ScanLine, C.cyan],
    server: [Server, C.emerald],
    shieldAlert: [ShieldAlert, C.rose],
    shield: [ShieldCheck, C.rose],
    shop: [ShoppingCart, C.emerald],
    sliders: [SlidersHorizontal, C.cyan],
    store: [Store, C.cyan],
    table: [Table2, C.emerald],
    test: [TestTube2, C.amber],
    user: [UserCog, C.rose],
    users: [Users, C.cyan],
    utensils: [Utensils, C.amber],
    wallet: [WalletCards, C.emerald],
    webhook: [Webhook, C.rose],
    wifi: [Wifi, C.emerald],
    workflow: [Workflow, C.cyan],
    money: [CircleDollarSign, C.emerald],
  };
  for (const [name, [Icon, color]] of Object.entries(iconSpecs)) I[name] = await iconData(Icon, color);

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'QR_WIDE', width: W, height: H });
  pptx.layout = 'QR_WIDE';
  pptx.author = thesis.author;
  pptx.company = 'Trường Đại học Công nghệ Thông tin';
  pptx.subject = 'QRTable graduation thesis defense deck';
  pptx.title = thesis.title;
  pptx.lang = 'vi-VN';
  pptx.theme = { headFontFace: FONT.sans, bodyFontFace: FONT.sans, lang: 'vi-VN' };

  // 01 Cover
  {
    const s = baseSlide(pptx, {
      section: '',
      title: '',
      subtitle: '',
      code: '01_cover',
      photo: true,
      header: false,
    });
    s.addText('KHÓA LUẬN TỐT NGHIỆP · 2026', {
      x: 0.83,
      y: 0.6,
      w: 5.5,
      h: 0.22,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 11,
      color: C.cyan,
      bold: true,
      charSpacing: 1.6,
    });
    s.addText(thesis.title, {
      x: 0.83,
      y: 1.22,
      w: 8.5,
      h: 2.46,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 31,
      color: C.text,
      bold: true,
      fit: 'shrink',
      valign: 'mid',
    });
    s.addText('SaaS POS · Đặt món qua mã QR · Kiến trúc vi dịch vụ', {
      x: 0.83,
      y: 4.12,
      w: 7.2,
      h: 0.3,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 11,
      color: C.emerald,
      bold: true,
    });
    s.addText(`${thesis.author} · MSSV ${thesis.studentId}`, {
      x: 0.83,
      y: 5.28,
      w: 5.6,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 14.5,
      color: C.text,
      bold: true,
    });
    s.addText(`${thesis.faculty} · Giảng viên hướng dẫn: ${thesis.supervisor}`, {
      x: 0.83,
      y: 5.72,
      w: 7.7,
      h: 0.28,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 12,
      color: C.muted,
    });
    addNotes(
      s,
      `Mở đầu bằng tên đề tài chính thức. Ảnh nền hiện là prototype ${assets.coverBackground.path}; logo ở footer là placeholder riêng và tên trường là text độc lập.`,
    );
  }

  // 02 Agenda
  {
    const s = baseSlide(pptx, {
      section: 'Tổng quan',
      title: 'Nội dung trình bày',
      subtitle: 'Mạch trình bày đi từ bài toán nghiệp vụ đến các quyết định thiết kế và bằng chứng kiểm chứng.',
      code: '02_agenda',
    });
    const agenda = [
      ['01', 'Bối cảnh và bài toán hệ thống'],
      ['02', 'Phân tích và quyết định kiến trúc'],
      ['03', 'Khung phân tích và kiểm chứng'],
      ['04', 'Các cơ chế cốt lõi của QRTable'],
      ['05', 'Bằng chứng, giới hạn và kết luận'],
    ];
    agenda.forEach(([n, label], i) => {
      const y = 2.64 + i * 0.72;
      s.addText(n, {
        x: 1.05,
        y,
        w: 0.45,
        h: 0.23,
        margin: 0,
        fontFace: FONT.mono,
        fontSize: 11,
        color: i === 0 ? C.cyan : C.dim,
        bold: true,
      });
      s.addText(label, {
        x: 1.75,
        y: y - 0.04,
        w: 8.8,
        h: 0.36,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 19,
        color: i === 0 ? C.cyan : C.muted,
        bold: i === 0,
      });
    });
    addNotes(s, 'Giới thiệu năm phần chính. Không đọc như mục lục của report; nhấn mạnh đây là mạch lập luận kỹ thuật.');
  }

  // 03 Context
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Một ca phục vụ F&B là chuỗi phối hợp giữa nhiều tác nhân',
      subtitle:
        'Khách, nhân viên phục vụ, bếp, thu ngân và quản lý cùng tác động lên một phiên bàn và các trạng thái liên quan.',
      code: '03_business_context',
    });
    addFourCards(s, [
      { icon: I.qr, color: C.cyan, title: 'Khách tại bàn', body: 'Quét QR, xem thực đơn, thao tác giỏ món và theo dõi trạng thái đơn.' },
      { icon: I.users, color: C.emerald, title: 'Nhân viên POS', body: 'Xác nhận đơn, xử lý yêu cầu phục vụ, hóa đơn và thanh toán.' },
      { icon: I.chef, color: C.amber, title: 'Bếp và quầy', body: 'Nhận phiếu theo trạm, ưu tiên công việc và cập nhật trạng thái món.' },
      { icon: I.user, color: C.rose, title: 'Quản lý', body: 'Quản trị thực đơn, nhân sự, báo cáo và cấu hình theo đơn vị thuê bao.' },
    ]);
    addCallout(
      s,
      'Mã QR chỉ là điểm bắt đầu; bài toán chính là duy trì một luồng vận hành thống nhất qua nhiều vai trò và hệ thống con.',
    );
    addNotes(s, 'Dẫn từ bối cảnh nghiệp vụ. Không nói hệ thống chỉ là QR menu.');
  }

  // 04 Golden business flow
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Từ mã QR đến thanh toán: một luồng, nhiều trạng thái',
      subtitle: 'Luồng nghiệp vụ này là trục demo sau phần trình bày và cũng là trục kiểm chứng tích hợp của đề tài.',
      code: '04_golden_flow',
    });
    addFlow(
      s,
      [
        { icon: I.qr, title: 'QR và phiên bàn', body: 'Xác định đúng đơn vị thuê bao, bàn và phiên phục vụ.' },
        { icon: I.shop, title: 'Giỏ và gửi đơn', body: 'Giỏ dùng chung có phiên bản; gửi đơn có tính lũy đẳng.' },
        { icon: I.clipboard, title: 'Xác nhận đơn', body: 'Nhân viên xác nhận; Catalog xử lý tồn kho.' },
        { icon: I.chef, title: 'KDS', body: 'Kitchen dựng phiếu bếp từ sự kiện xác nhận đơn.' },
        { icon: I.wallet, title: 'Thanh toán', body: 'Bill và payment khép phiên; bàn chuyển sang dọn dẹp.' },
      ],
      { y: 2.74, h: 2.72 },
    );
    addCallout(s, 'Demo riêng 5-7 phút: QR → Cart → Order → KDS → Payment.', C.emerald, 6.0);
    addNotes(s, 'Đây là bản đồ luồng nghiệp vụ, chưa phải demo live.');
  }

  // 05 Problem statement
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Bài toán hệ thống đặt ra',
      subtitle: 'Bài toán nằm ở việc phối hợp dữ liệu, trạng thái và quyền truy cập trong toàn bộ quy trình phục vụ.',
      code: '05_problem_statement',
    });
    addFourCards(s, [
      {
        icon: I.building,
        color: C.cyan,
        title: 'Cô lập đơn vị thuê bao',
        body: 'Mỗi nhà hàng có dữ liệu, cấu hình và phạm vi truy cập riêng. Mọi yêu cầu phải duy trì đúng ngữ cảnh đơn vị thuê bao.',
      },
      {
        icon: I.radio,
        color: C.emerald,
        title: 'Phối hợp trạng thái vận hành',
        body: 'Đơn hàng thay đổi qua Customer, POS và KDS. Client nhận tín hiệu cập nhật nhưng vẫn tải lại trạng thái từ nguồn dữ liệu đúng.',
      },
      {
        icon: I.databaseZap,
        color: C.amber,
        title: 'Nhất quán giữa các dịch vụ',
        body: 'Order, tồn kho và thanh toán thuộc các ranh giới khác nhau. Lỗi một phần không được để lại trạng thái nghiệp vụ sai.',
      },
      {
        icon: I.shield,
        color: C.rose,
        title: 'Kiểm soát truy cập nhiều lớp',
        body: 'Nhân viên, chủ quán, quản trị nền tảng và khách qua QR sử dụng các cơ chế xác thực và giới hạn phạm vi khác nhau.',
      },
    ]);
    addNotes(s, 'Không dùng claim tuyệt đối. Đây là bốn nhóm bài toán dẫn tới các quyết định kiến trúc.');
  }

  // 06 Objective and scope
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Mục tiêu và phạm vi của đề tài',
      subtitle:
        'Đề tài tập trung vào lõi vận hành của nền tảng SaaS POS và các cơ chế cần thiết để hiện thực luồng QR ordering theo kiến trúc vi dịch vụ.',
      code: '06_objective_scope',
    });
    addTwoColumns(
      s,
      {
        icon: I.check,
        title: 'Phạm vi chính',
        items: [
          'QR session, giỏ dùng chung, gửi và xác nhận đơn.',
          'KDS projection và cập nhật gần thời gian thực.',
          'Thanh toán tiền mặt, VietQR/SePay và hoàn tất hóa đơn.',
          'RBAC, cô lập đơn vị thuê bao, quyền lợi theo gói.',
          'Order Confirm Saga và bằng chứng kiểm thử tương ứng.',
        ],
      },
      {
        icon: I.alert,
        title: 'Giới hạn kết luận',
        items: [
          'Không khẳng định hệ thống đã sẵn sàng vận hành thực tế toàn diện.',
          'Chưa có phép đo hiệu năng để kết luận khả năng chịu tải lớn.',
          'Không khẳng định cơ chế phân phối đúng một lần (exactly-once).',
          'Không có tiêm lỗi toàn ngăn xếp cho mọi nhánh Saga.',
          'Không suy rộng một luồng đại diện thành bằng chứng cho mọi nhánh lỗi.',
        ],
      },
      { rightColor: C.rose, h: 3.95 },
    );
    addNotes(s, 'Nêu ranh giới rõ nhưng không biến slide thành disclaimer. Đây là phạm vi chính thức của phần trình bày.');
  }

  // 07 Actors
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Các tác nhân truy cập hệ thống theo hai mô hình khác nhau',
      subtitle:
        'Nhân viên và quản trị viên dùng định danh Keycloak cùng RBAC; khách tại bàn dùng mã QR và ngữ cảnh phiên phục vụ.',
      code: '07_actors',
    });
    const actors = [
      { icon: I.qr, color: C.cyan, title: 'Khách tại bàn', body: 'QR token + customer session\nMenu, cart, submit và theo dõi đơn' },
      { icon: I.users, color: C.emerald, title: 'Nhân viên', body: 'JWT + RBAC + tenant context\nPOS, xác nhận đơn và thanh toán' },
      { icon: I.chef, color: C.amber, title: 'Bếp / quầy', body: 'JWT + station access\nKDS queue và trạng thái món' },
      { icon: I.user, color: C.rose, title: 'Owner / Manager', body: 'JWT + RBAC + entitlement\nThực đơn, nhân sự, báo cáo, cấu hình' },
    ];
    addFourCards(s, actors, 2.72, 2.65);
    addIconCard(s, {
      x: 3.74,
      y: 5.58,
      w: 2.7,
      h: 0.85,
      icon: I.server,
      color: C.cyan,
      title: 'Super Admin',
      body: 'Quyền quản trị nền tảng',
      titleSize: 13,
      bodySize: 9.5,
    });
    addIconCard(s, {
      x: 6.9,
      y: 5.58,
      w: 2.7,
      h: 0.85,
      icon: I.webhook,
      color: C.rose,
      title: 'SePay',
      body: 'Ranh giới webhook/OAuth',
      titleSize: 13,
      bodySize: 9.5,
    });
    addNotes(s, 'Nhấn mạnh Customer không thuộc role RBAC; customer dùng session context riêng.');
  }

  // 08 Contributions
  {
    const s = baseSlide(pptx, {
      section: 'Phần 1 · Bối cảnh và bài toán',
      title: 'Đóng góp của đề tài',
      subtitle:
        'Đóng góp nằm ở việc mô hình hóa, thiết kế, hiện thực và kiểm chứng một lõi SaaS POS tích hợp QR ordering có ranh giới kỹ thuật rõ ràng.',
      code: '08_contributions',
    });
    addFourCards(s, [
      { icon: I.store, color: C.cyan, title: 'Mô hình SaaS POS F&B', body: 'Kết nối QR ordering, POS, KDS, payment và quản trị nhiều đơn vị thuê bao.' },
      { icon: I.boxes, color: C.emerald, title: 'Vi dịch vụ có ranh giới', body: 'Service boundary, data ownership và hợp đồng giao tiếp được xác định theo domain.' },
      { icon: I.repeat, color: C.amber, title: 'Cơ chế phân tán', body: 'Tính lũy đẳng, loại trùng, outbox, Saga và bản chiếu KDS theo phạm vi đã hiện thực.' },
      { icon: I.evidence, color: C.rose, title: 'Bằng chứng truy vết', body: 'Kiểm thử, trạng thái dữ liệu, log/trace và ma trận yêu cầu được dùng để kiểm soát kết luận.' },
    ]);
    addNotes(s, 'Không claim thuật toán mới. Đây là đóng góp kỹ thuật phần mềm và tích hợp hệ thống.');
  }

  // 09 Drivers
  {
    const s = baseSlide(pptx, {
      section: 'Phần 2 · Phân tích và thiết kế kiến trúc',
      title: 'Các động lực kiến trúc của QRTable',
      subtitle:
        'Bốn yêu cầu xuyên suốt chi phối cách phân rã dịch vụ, lựa chọn kênh giao tiếp và tổ chức các lớp kiểm soát.',
      code: '09_architecture_drivers',
    });
    addLargeDrivers(s, [
      { icon: I.building, title: 'Đa đơn vị thuê bao', body: 'Dữ liệu, phiên, bộ nhớ đệm và quyền truy cập luôn gắn với đúng đơn vị thuê bao.' },
      { icon: I.radio, title: 'Gần thời gian thực', body: 'POS, KDS và client khách cần nhận thay đổi nhanh; WebSocket chỉ là tín hiệu cập nhật.' },
      { icon: I.scale, title: 'Nhất quán phân tán', body: 'Mỗi dịch vụ sở hữu dữ liệu riêng; retry, duplicate và lỗi từng phần phải được kiểm soát.' },
      { icon: I.key, title: 'Phân quyền nhiều lớp', body: 'RBAC, tenant isolation, entitlement và quyền nền tảng là các lớp kiểm soát riêng biệt.' },
    ]);
    addCallout(
      s,
      'Các động lực này dẫn tới một kiến trúc có ranh giới dịch vụ rõ, giao tiếp có chọn lọc và bằng chứng kiểm chứng theo từng cơ chế.',
    );
    addNotes(s, 'Chưa nói công nghệ. Đây là yêu cầu chất lượng dẫn dắt kiến trúc.');
  }

  // 10 Microservices decision
  {
    const s = baseSlide(pptx, {
      section: 'Phần 2 · Phân tích và thiết kế kiến trúc',
      title: 'Cơ sở lựa chọn kiến trúc vi dịch vụ cho QRTable',
      subtitle:
        'Lựa chọn này phù hợp với ranh giới nghiệp vụ của hệ thống, nhưng chỉ có ý nghĩa khi các chi phí phân tán được xử lý có chủ đích.',
      code: '10_microservices_decision',
    });
    const cards = [
      { x: 0.83, y: 2.6, icon: I.boxes, color: C.emerald, tag: 'Cơ sở lựa chọn', title: 'Ranh giới nghiệp vụ có thể phân tách', body: 'Catalog, Order, Kitchen, Payment và User-Access có trách nhiệm và vòng đời dữ liệu khác nhau.' },
      { x: 6.78, y: 2.6, icon: I.database, color: C.emerald, tag: 'Cơ sở lựa chọn', title: 'Quyền sở hữu dữ liệu được xác định rõ', body: 'Mỗi dịch vụ quản lý dữ liệu của mình; dịch vụ khác tương tác qua hợp đồng thay vì truy cập CSDL chéo.' },
      { x: 0.83, y: 4.64, icon: I.network, color: C.amber, tag: 'Chi phí phát sinh', title: 'Giao tiếp và nhất quán trở nên phức tạp hơn', body: 'Hệ thống phải lựa chọn giữa lời gọi đồng bộ, sự kiện bất đồng bộ, tính lũy đẳng, loại trùng và bù trừ.' },
      { x: 6.78, y: 4.64, icon: I.alert, color: C.rose, tag: 'Chi phí phát sinh', title: 'Kiểm thử và vận hành cần nhiều lớp bằng chứng', body: 'Một giao diện hoạt động chưa đủ chứng minh ranh giới dịch vụ, nhánh lỗi, trạng thái dữ liệu và hành vi khi phát lại.' },
    ];
    cards.forEach((card) => addIconCard(s, { ...card, w: 5.72, h: 1.8, bodySize: 11.4 }));
    addCallout(
      s,
      'QRTable xem vi dịch vụ là quyết định thiết kế gắn với ranh giới nghiệp vụ và cơ chế kiểm soát lỗi phân tán, không phải mục tiêu tự thân.',
      C.cyan,
      6.68,
    );
    addNotes(s, 'Trình bày cả cơ sở lựa chọn và chi phí. Không khẳng định microservices luôn tốt hơn modular monolith.');
  }

  // 11 Challenges
  {
    const s = baseSlide(pptx, {
      section: 'Phần 2 · Phân tích và thiết kế kiến trúc',
      title: 'Vi dịch vụ làm phát sinh một tập thách thức cần giải quyết',
      subtitle:
        'Phần còn lại của deck lần lượt trả lời cách QRTable xử lý các vấn đề do chính ranh giới phân tán tạo ra.',
      code: '11_microservices_challenges',
    });
    const items = [
      [I.cable, C.cyan, 'Giao tiếp liên dịch vụ', 'Chọn đúng kênh đồng bộ hoặc bất đồng bộ.'],
      [I.key, C.rose, 'Xác thực và ngữ cảnh', 'Xác định chủ thể, tenant và phiên tin cậy.'],
      [I.shield, C.rose, 'Phân quyền nhiều lớp', 'RBAC, tenant isolation và entitlement.'],
      [I.databaseZap, C.amber, 'Nhất quán dữ liệu', 'Retry, duplicate và nguồn dữ liệu đúng.'],
      [I.workflow, C.cyan, 'Giao dịch phân tán', 'Saga, điểm commit và hành động bù trừ.'],
      [I.radio, C.emerald, 'Bản chiếu realtime', 'KDS projection và WebSocket hint/refetch.'],
    ];
    items.forEach(([icon, color, title, body], i) => {
      const x = 0.83 + (i % 3) * 4.02;
      const y = 2.56 + Math.floor(i / 3) * 1.77;
      addIconCard(s, { x, y, w: 3.78, h: 1.48, icon, color, title, body, titleSize: 14.2, bodySize: 10.4 });
    });
    addNotes(s, 'Đây là bản đồ vấn đề. Không giải thích sâu từng cơ chế tại slide này.');
  }

  // 12 Overall architecture
  {
    const s = baseSlide(pptx, {
      section: 'Phần 2 · Phân tích và thiết kế kiến trúc',
      title: 'Kiến trúc tổng thể phân bổ trách nhiệm theo ranh giới dịch vụ',
      subtitle:
        'BFF bảo vệ biên hệ thống; các dịch vụ nghiệp vụ sở hữu dữ liệu riêng và chỉ tương tác qua hợp đồng hoặc sự kiện.',
      code: '12_overall_architecture',
    });
    addCleanPlaceholder(s, assets.architectureOverview, {
      x: 0.83,
      y: 2.55,
      w: 8.55,
      h: 3.95,
      icon: I.network,
      description:
        'Vị trí dành cho sơ đồ tổng thể: client đi qua BFF, các dịch vụ nội bộ và cách TCP, gRPC, Kafka, Redis cùng các CSDL được sử dụng.',
      chips: [
        { label: 'Client edge', color: C.cyan },
        { label: 'Ranh giới dịch vụ', color: C.emerald },
        { label: 'Event / state', color: C.amber },
      ],
    });
    s.addText('Ba nguyên tắc chính', {
      x: 9.72,
      y: 2.62,
      w: 2.55,
      h: 0.32,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 16.5,
      color: C.cyan,
      bold: true,
    });
    s.addText(
      [
        { text: 'BFF là cửa ngõ HTTP/WebSocket, không chứa nghiệp vụ lõi.', options: { bullet: true, breakLine: true } },
        { text: 'Mỗi dịch vụ sở hữu dữ liệu và quy tắc xử lý của domain.', options: { bullet: true, breakLine: true } },
        { text: 'Giao tiếp đồng bộ và bất đồng bộ được chọn theo loại tương tác.', options: { bullet: true } },
      ],
      {
        x: 9.72,
        y: 3.2,
        w: 2.6,
        h: 2.25,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 11.7,
        color: C.muted,
        paraSpaceAfterPt: 12,
        fit: 'shrink',
      },
    );
    addNotes(s, `Placeholder: ${assets.architectureOverview.id}. Nguồn và hướng dẫn thay nằm trong asset registry.`);
  }

  // 13 Ownership
  {
    const s = baseSlide(pptx, {
      section: 'Phần 2 · Phân tích và thiết kế kiến trúc',
      title: 'Ranh giới dịch vụ đi cùng quyền sở hữu dữ liệu',
      subtitle:
        'Một dịch vụ sở hữu dữ liệu và hành vi của domain; dịch vụ khác chỉ tương tác qua hợp đồng, không truy cập cơ sở dữ liệu chéo.',
      code: '13_service_ownership',
    });
    addCleanPlaceholder(s, assets.serviceOwnership, {
      x: 0.83,
      y: 2.58,
      w: 6.2,
      h: 3.88,
      icon: I.database,
      description: 'Ownership map cuối cần gắn mỗi nhóm dữ liệu với đúng dịch vụ sở hữu và thể hiện Kitchen là Redis projection.',
      chips: [
        { label: 'Database per service', color: C.cyan },
        { label: 'Contract only', color: C.emerald },
      ],
    });
    addTable(
      s,
      [
        ['Dịch vụ', 'Dữ liệu sở hữu'],
        ['Catalog', 'Menu, table, QR, stock'],
        ['Order', 'Session, cart, order, bill'],
        ['Kitchen', 'KDS Redis projection'],
        ['Payment', 'Transaction, settings'],
        ['SaaS', 'Tenant, plan, subscription'],
        ['User-Access', 'Profile, role, staff'],
      ],
      { x: 7.34, y: 2.48, w: 5.16, rowH: 0.54, weights: [1, 1.9], bodySize: 9.4 },
    );
    addNotes(s, `Placeholder: ${assets.serviceOwnership.id}. Nhấn mạnh Catalog là dịch vụ duy nhất ghi stock.`);
  }

  // 14 Design framework
  {
    const s = baseSlide(pptx, {
      section: 'Phần 3 · Khung phân tích và kiểm chứng',
      title: 'Khung phân tích các quyết định thiết kế của QRTable',
      subtitle:
        'Mỗi cơ chế được trình bày theo cùng một chuỗi lập luận để nối vấn đề kiến trúc với cách hiện thực và mức bằng chứng.',
      code: '14_design_framework',
    });
    addFlow(
      s,
      [
        { icon: I.alert, title: 'Thách thức', body: 'Vấn đề phân tán hoặc vận hành cần giải quyết.', color: C.rose },
        { icon: I.lock, title: 'Bất biến', body: 'Điều hệ thống không được phép vi phạm.', color: C.amber },
        { icon: I.sliders, title: 'Quyết định', body: 'Cơ chế hoặc mẫu thiết kế được lựa chọn.', color: C.cyan },
        { icon: I.server, title: 'Hiện thực', body: 'Service, guard, event, database hoặc Redis liên quan.', color: C.emerald },
        { icon: I.evidence, title: 'Bằng chứng', body: 'UI, state, log, test và traceability hỗ trợ kết luận.', color: C.cyan },
      ],
      { y: 2.75, h: 2.65 },
    );
    addCallout(
      s,
      'Ví dụ: giao dịch phân tán → không giữ đơn đã xác nhận khi tồn kho hoặc commit lỗi → Saga và bù trừ → Order/Catalog → kiểm thử và trạng thái dữ liệu.',
      C.cyan,
      6.05,
    );
    addNotes(s, 'Đây là khung system design, không gọi là thuật toán hoặc phương pháp nghiên cứu.');
  }

  // 15 Evidence model
  {
    const s = baseSlide(pptx, {
      section: 'Phần 3 · Khung phân tích và kiểm chứng',
      title: 'Phương pháp kiểm chứng kết hợp nhiều lớp bằng chứng',
      subtitle:
        'Không một loại hiện vật đơn lẻ có thể chứng minh đầy đủ hành vi người dùng, trạng thái dữ liệu và cơ chế phân tán.',
      code: '15_evidence_model',
    });
    addFourCards(s, [
      { icon: I.monitor, color: C.cyan, title: 'UI demo', body: 'Chứng minh luồng mà người dùng quan sát được và sự phối hợp giữa các client.' },
      { icon: I.database, color: C.emerald, title: 'Database / Redis state', body: 'Chứng minh dữ liệu thật đã chuyển trạng thái sau thao tác.' },
      { icon: I.logs, color: C.amber, title: 'Log / trace', body: 'Chứng minh đường đi liên dịch vụ, correlation, event và nhánh lỗi.' },
      { icon: I.test, color: C.rose, title: 'Kiểm thử và truy vết', body: 'Chứng minh bất biến có thể kiểm tra lặp lại và nối yêu cầu với evidence.' },
    ]);
    addCallout(s, 'Mỗi kết luận chỉ được nâng mức khi có hiện vật đã thu và kiểm tra; sơ đồ minh họa không thay thế bằng chứng.');
    addNotes(s, 'Chuẩn bị cho slide evidence cuối và phần demo riêng.');
  }

  // 16 Sync vs async
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Giao tiếp liên dịch vụ được chọn theo tính chất tương tác',
      subtitle:
        'QRTable không đưa mọi tương tác qua Kafka và cũng không dùng lời gọi đồng bộ cho mọi tác dụng phụ.',
      code: '16_sync_async',
    });
    addTwoColumns(
      s,
      {
        icon: I.cable,
        title: 'Giao tiếp đồng bộ',
        items: [
          'Phù hợp khi caller cần kết quả ngay để tiếp tục nghiệp vụ.',
          'Lỗi được trả về trực tiếp để caller quyết định.',
          'QRTable dùng TCP cho lời gọi nội bộ và gRPC cho Authorizer.',
          'Đánh đổi: ghép nối theo thời gian và cần xử lý timeout/lỗi downstream.',
        ],
      },
      {
        icon: I.message,
        title: 'Giao tiếp bất đồng bộ',
        items: [
          'Phù hợp với tác dụng phụ sau commit và các bản chiếu dữ liệu.',
          'Producer và consumer không phải hoàn tất cùng thời điểm.',
          'QRTable dùng Kafka cho một số domain event có owner rõ.',
          'Đánh đổi: cần loại trùng, retry và kiểm soát tính nhất quán cuối cùng.',
        ],
      },
      { h: 3.95, rightColor: C.emerald },
    );
    addNotes(s, 'Giải thích tiêu chí lựa chọn trước khi liệt kê kênh giao tiếp QRTable.');
  }

  // 17 Communication model
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Mô hình giao tiếp của QRTable',
      subtitle:
        'Client đi qua BFF; lời gọi nội bộ dùng contract đồng bộ; domain event chỉ được sử dụng cho các tác dụng phụ phù hợp.',
      code: '17_communication_model',
    });
    addFourCards(s, [
      { icon: I.monitor, color: C.cyan, title: 'HTTP và WebSocket', body: 'BFF là biên giao tiếp cho Customer PWA và Management App.' },
      { icon: I.cable, color: C.emerald, title: 'TCP nội bộ', body: 'Command/query giữa các dịch vụ nghiệp vụ cần phản hồi trực tiếp.' },
      { icon: I.key, color: C.rose, title: 'gRPC Authorizer', body: 'BFF xác minh JWT và thiết lập ngữ cảnh người dùng tin cậy.' },
      { icon: I.message, color: C.amber, title: 'Kafka domain event', body: 'Tác dụng phụ sau commit như KDS hoặc payment finalization.' },
    ]);
    addTable(
      s,
      [
        ['Topic canonical', 'Vai trò chính'],
        ['order.confirmed', 'Kitchen tạo KDS projection'],
        ['order.status_changed', 'Lan truyền trạng thái đơn phù hợp'],
        ['payment.completed', 'Order hoàn tất bill và session'],
        ['kitchen.sla_warning', 'Cảnh báo SLA bếp'],
        ['tenant.created', 'Tác dụng phụ sau cấp phát tenant'],
      ],
      { x: 2.15, y: 5.62, w: 9.05, rowH: 0.22, weights: [1, 2.1], headerSize: 6.4, bodySize: 6.5 },
    );
    addNotes(s, 'Registry canonical hiện có năm topic. Không thêm topic UI hoặc menu.updated.');
  }

  // 18 Authentication
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Xác thực tạo ra ngữ cảnh tin cậy cho các lớp kiểm soát phía sau',
      subtitle:
        'QRTable tách luồng định danh của nhân viên và quản trị viên khỏi luồng khách tại bàn sử dụng mã QR.',
      code: '18_authentication',
    });
    addTwoColumns(
      s,
      {
        icon: I.key,
        title: 'Nhân viên và quản trị viên',
        items: [
          'Keycloak JWT/OIDC là nguồn định danh.',
          'BFF UserGuard gọi Authorizer qua gRPC.',
          'Kết quả xác minh tạo user context cho tenant và permission.',
          'Thông tin xác minh có thể được cache theo token hash.',
        ],
      },
      {
        icon: I.qr,
        title: 'Khách tại bàn',
        items: [
          'Không yêu cầu tài khoản Keycloak.',
          'QR token xác định đơn vị thuê bao và bàn.',
          'Customer session trong Redis giới hạn hành vi theo phiên phục vụ.',
          'Các API khách sử dụng guard và vòng đời session riêng.',
        ],
      },
      { h: 3.92 },
    );
    addNotes(s, 'Customer không nằm trong role seed và không đi qua RBAC như staff.');
  }

  // 19 Authorization
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Phân quyền nhiều lớp: RBAC không thay thế cô lập tenant và quyền lợi theo gói',
      subtitle:
        'Mỗi lớp trả lời một câu hỏi kiểm soát khác nhau; gộp chúng thành một khái niệm authorization sẽ làm mất logic thiết kế.',
      code: '19_authorization_layers',
    });
    addFlow(
      s,
      [
        { icon: I.key, title: 'UserGuard', body: 'Chủ thể là ai và token có hợp lệ không?', color: C.cyan },
        { icon: I.building, title: 'TenantGuard', body: 'Yêu cầu thuộc đơn vị thuê bao nào?', color: C.emerald },
        { icon: I.shield, title: 'PermissionGuard', body: 'Chủ thể có quyền thực hiện hành động?', color: C.rose },
        { icon: I.receipt, title: 'Subscription context', body: 'Đơn vị thuê bao có trạng thái gói phù hợp?', color: C.amber },
        { icon: I.sliders, title: 'PlanFeatureGuard', body: 'Gói hiện tại có tính năng được yêu cầu?', color: C.cyan },
      ],
      { y: 2.72, h: 2.72 },
    );
    addCallout(s, 'Super Admin là ngoại lệ có kiểm soát; customer session đi theo guard riêng, không đi qua role seed.');
    addNotes(s, 'Không đưa số permission cụ thể vì tài liệu canonical còn drift giữa 62 và 67.');
  }

  // 20 Tenant isolation
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Cô lập đơn vị thuê bao được duy trì xuyên suốt request và trạng thái',
      subtitle:
        'Bất biến cần bảo vệ: yêu cầu của đơn vị thuê bao A không được đọc hoặc ghi dữ liệu của đơn vị thuê bao B.',
      code: '20_tenant_isolation',
    });
    addFlow(
      s,
      [
        { icon: I.scan, title: 'Thiết lập context', body: 'JWT, route hoặc QR/session cung cấp tenantId tin cậy.', color: C.cyan },
        { icon: I.shield, title: 'Kiểm tra mismatch', body: 'TenantGuard từ chối yêu cầu có tenant context không phù hợp.', color: C.rose },
        { icon: I.database, title: 'Giới hạn dữ liệu', body: 'Repository/query sử dụng tenant scope trong dịch vụ sở hữu.', color: C.emerald },
        { icon: I.link, title: 'Lan truyền có chủ đích', body: 'Redis key, event payload và WebSocket room mang tenantId.', color: C.amber },
      ],
      { y: 2.75, h: 2.78 },
    );
    addCallout(s, 'Cô lập tenant không chỉ là cột tenant_id; đó là chuỗi kiểm soát từ biên API đến nơi lưu trữ và kênh sự kiện.');
    addNotes(s, 'Claim đại diện có guard specs và live smoke; không dùng từ “tuyệt đối”.');
  }

  // 21 Consistency principles
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Nhất quán và tính lũy đẳng xử lý retry trong hệ thống phân tán',
      subtitle:
        'Một yêu cầu, webhook hoặc sự kiện được phát lại không được tạo thêm order, payment hoặc KDS ticket ngoài ý muốn.',
      code: '21_consistency_principles',
    });
    addTwoColumns(
      s,
      {
        icon: I.database,
        title: 'Trong một dịch vụ',
        items: [
          'Dùng transaction cục bộ, lock và kiểm tra trạng thái.',
          'Nguồn dữ liệu đúng nằm trong CSDL của dịch vụ sở hữu.',
          'Ví dụ: Order khóa order/bill khi xác nhận.',
          'Ví dụ: Payment kiểm tra trạng thái và giao dịch trùng.',
        ],
      },
      {
        icon: I.repeat,
        title: 'Giữa nhiều dịch vụ',
        items: [
          'Không có một transaction ACID duy nhất cho toàn hệ thống.',
          'Cần idempotency key, dedupe key, outbox/event và bù trừ.',
          'Các consumer phải chấp nhận khả năng nhận lại thông điệp.',
          'QRTable không khẳng định exactly-once messaging.',
        ],
      },
      { h: 3.92, rightColor: C.amber },
    );
    addNotes(s, 'Phân biệt local consistency với eventual consistency giữa service.');
  }

  // 22 Consistency mechanisms
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Cơ chế nhất quán trong QRTable được lựa chọn theo từng luồng',
      subtitle:
        'Mỗi luồng có owner, điểm ghi nhận và cơ chế chống lặp riêng; không có một giải pháp duy nhất cho mọi loại trạng thái.',
      code: '22_consistency_mechanisms',
    });
    addTable(
      s,
      [
        ['Luồng', 'Cơ chế chính', 'Mục tiêu'],
        ['Giỏ và gửi đơn', 'cartVersion + idempotency key', 'Tránh ghi đè thay đổi mới và tạo đơn lặp'],
        ['Xác nhận đơn / tồn kho', 'Order lock + Catalog TCP + outbox + bù trừ', 'Không xác nhận đơn khi tồn kho hoặc commit thất bại'],
        ['KDS projection', 'Redis dedupe theo eventId và order/station', 'Không tạo nhiều ticket từ sự kiện phát lại'],
        ['Payment finalization', 'payment.completed + markPaid lũy đẳng', 'Không hoàn tất hóa đơn và phiên nhiều lần'],
        ['Tenant / RBAC', 'Guard chain + tenant-scoped API', 'Không truy cập sai phạm vi hoặc bỏ qua permission'],
      ],
      { y: 2.48, rowH: 0.67, weights: [1.1, 1.8, 2.05], bodySize: 9.2 },
    );
    addCallout(s, 'Outbox và sự kiện chỉ được trình bày trong phạm vi có dấu vết code/test; không suy rộng thành nền tảng exactly-once.');
    addNotes(s, 'Slide này nối cơ chế với mục tiêu, không đưa command test chi tiết.');
  }

  // 23 Saga principle
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Saga phối hợp giao dịch phân tán bằng chuỗi transaction cục bộ',
      subtitle:
        'Khi mỗi dịch vụ sở hữu một cơ sở dữ liệu riêng, lỗi sau một tác dụng phụ cần được xử lý bằng điều phối và hành động bù trừ.',
      code: '23_saga_principle',
    });
    addFourCards(s, [
      { icon: I.database, color: C.cyan, title: 'Transaction cục bộ', body: 'Mỗi dịch vụ chỉ cập nhật dữ liệu thuộc quyền sở hữu của mình.' },
      { icon: I.workflow, color: C.emerald, title: 'Điều phối', body: 'Một dịch vụ xác định thứ tự gọi, điều kiện chuyển bước và điểm commit nghiệp vụ.' },
      { icon: I.refresh, color: C.rose, title: 'Bù trừ', body: 'Nếu tác dụng phụ đã xảy ra nhưng bước sau thất bại, hệ thống gọi hành động hoàn tác nghiệp vụ.' },
      { icon: I.repeat, color: C.amber, title: 'Biên idempotency', body: 'Retry và replay sử dụng khóa ổn định để không nhân đôi tác dụng phụ.' },
    ]);
    addCallout(s, 'Deck chỉ đào sâu một trường hợp đại diện: Order Confirm Saga.');
    addNotes(s, 'Không claim QRTable có full Saga platform, durable saga state hoặc retry worker.');
  }

  // 24 Order Confirm Saga
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Order Confirm Saga: xác nhận đơn hàng và bảo toàn tồn kho',
      subtitle:
        'Luồng này phối hợp Order và Catalog mà không sử dụng một transaction cơ sở dữ liệu chung.',
      code: '24_order_confirm_saga',
    });
    addCleanPlaceholder(s, assets.orderConfirmSaga, {
      x: 0.83,
      y: 2.55,
      w: 7.75,
      h: 3.95,
      icon: I.workflow,
      description:
        'Vị trí dành cho sơ đồ thể hiện luồng thành công, lỗi sau khi Catalog đã trừ tồn kho, hành động bù trừ và biên lũy đẳng.',
      chips: [
        { label: 'Luồng thành công', color: C.emerald },
        { label: 'Nhánh lỗi', color: C.rose },
        { label: 'Bù trừ', color: C.amber },
        { label: 'Biên idempotency', color: C.cyan },
      ],
      linkLabel: 'Mở Hình 5.2 trong báo cáo',
    });
    s.addText('Bất biến cần bảo vệ', {
      x: 8.95,
      y: 2.62,
      w: 3.45,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 15.5,
      color: C.cyan,
      bold: true,
    });
    s.addText(
      'Catalog là dịch vụ duy nhất cập nhật tồn kho; Order chỉ chuyển sang PROCESSING sau khi tồn kho được xử lý thành công; xác nhận lặp không được trừ tồn kho hai lần.',
      { x: 8.95, y: 3.03, w: 3.5, h: 1.1, margin: 0, fontFace: FONT.sans, fontSize: 11.2, color: C.muted, fit: 'shrink' },
    );
    s.addText('Điểm ghi nhận nghiệp vụ', {
      x: 8.95,
      y: 4.32,
      w: 3.45,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 15.5,
      color: C.emerald,
      bold: true,
    });
    s.addText(
      'Order ghi PROCESSING cùng outbox order.confirmed. Nếu bước này thất bại sau khi Catalog đã trừ tồn kho, Order gọi Catalog hoàn tồn kho.',
      { x: 8.95, y: 4.73, w: 3.5, h: 0.96, margin: 0, fontFace: FONT.sans, fontSize: 11.2, color: C.muted, fit: 'shrink' },
    );
    addNotes(
      s,
      `Placeholder ${assets.orderConfirmSaga.id}. Unit/contract chứng minh orchestration, replay, Catalog error và compensation; live deterministic fault injection sau deduct còn thiếu.`,
    );
  }

  // 25 Saga evidence
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Nhánh lỗi, bù trừ và mức bằng chứng của Order Confirm Saga',
      subtitle:
        'Bằng chứng mạnh nhất hiện nằm ở kiểm thử đơn vị và hợp đồng; kiểm thử tích hợp xác minh một phần ranh giới Order–Catalog.',
      code: '25_saga_evidence',
    });
    addTable(
      s,
      [
        ['Điểm kiểm chứng', 'Bằng chứng hiện có', 'Mức kết luận'],
        ['Luồng thành công', 'Trừ tồn kho, chuyển PROCESSING và ghi outbox order.confirmed', 'Kiểm thử tự động'],
        ['Phát lại', 'Đơn PROCESSING không trừ tồn kho hoặc ghi outbox lần hai', 'Kiểm thử tự động'],
        ['Lỗi nghiệp vụ Catalog', 'Order không commit khi tồn kho không đủ', 'Kiểm thử tự động + TCP error'],
        ['Bù trừ', 'Hoàn tồn kho sau lỗi phát sinh sau bước trừ; giữ lỗi gốc', 'Tiêm lỗi tại lớp dịch vụ'],
        ['Ranh giới thật', 'Order–Catalog stock integration có điều kiện', 'Bằng chứng tích hợp một phần'],
        ['Còn thiếu', 'Lỗi ghi Order/outbox sau khi Catalog thật đã trừ tồn kho', 'Cần bộ tiêm lỗi xác định'],
      ],
      { y: 2.42, rowH: 0.58, weights: [1.18, 2.08, 1.15], bodySize: 8.9 },
    );
    addCallout(s, 'Không kết luận Saga đã bao phủ mọi nhánh lỗi trong môi trường tích hợp thực.', C.rose, 6.54);
    addNotes(s, 'Bám saga-validation-strategy và P0-ORD-STATE-STOCK partial.');
  }

  // 26 KDS
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'KDS là bản chiếu Redis được cập nhật từ sự kiện xác nhận đơn',
      subtitle:
        'Kitchen không sở hữu lịch sử đơn hàng; nó tạo bản chiếu vận hành để phục vụ hàng đợi theo trạm và phát tín hiệu cập nhật cho client.',
      code: '26_kds_projection',
    });
    addFlow(
      s,
      [
        { icon: I.message, title: 'order.confirmed', body: 'Sự kiện được tạo sau điểm commit của Order.', color: C.cyan },
        { icon: I.chef, title: 'Kitchen consumer', body: 'Kiểm tra payload và xác định các trạm nhận món.', color: C.emerald },
        { icon: I.database, title: 'Redis projection', body: 'Lưu ticket, hàng đợi, chỉ mục và dedupe theo tenant/station.', color: C.amber },
        { icon: I.wifi, title: 'WebSocket hint', body: 'Client nhận tín hiệu và tải lại snapshot khi cần.', color: C.cyan },
      ],
      { y: 2.72, h: 2.85 },
    );
    addCallout(s, 'Bất biến: sự kiện order.confirmed bị phát lại không tạo nhiều ticket cho cùng tenant, order và station.');
    addNotes(s, 'WebSocket không phải nguồn sự thật; Redis projection có cơ chế dedupe đại diện.');
  }

  // 27 Payment bridge
  {
    const s = baseSlide(pptx, {
      section: 'Phần 4 · Các cơ chế cốt lõi',
      title: 'Payment hoàn tất giao dịch, Order hoàn tất hóa đơn và phiên phục vụ',
      subtitle:
        'Ranh giới Payment–Order được nối bằng sự kiện payment.completed và một thao tác markPaid có tính lũy đẳng.',
      code: '27_payment_bridge',
    });
    addFlow(
      s,
      [
        { icon: I.credit, title: 'Payment settles', body: 'Payment ghi nhận tiền mặt hoặc callback VietQR/SePay.', color: C.emerald },
        { icon: I.message, title: 'payment.completed', body: 'Outbox/event mang billId, paymentId và tenant context.', color: C.cyan },
        { icon: I.receipt, title: 'Order marks bill paid', body: 'BillService.markPaid xử lý phát lại theo cách lũy đẳng.', color: C.amber },
        { icon: I.table, title: 'Khép phiên bàn', body: 'Session/cart được dọn và bàn chuyển sang CLEANING.', color: C.emerald },
      ],
      { y: 2.72, h: 2.85 },
    );
    addCallout(s, 'Kiểm thử tích hợp đại diện đã chứng minh payment.completed → bill paid → session closed → table cleaning và chấp nhận replay.');
    addNotes(s, 'Không claim live provider SePay toàn diện; slide tập trung internal bridge đã có evidence.');
  }

  // 28 Golden flow evidence
  {
    const s = baseSlide(pptx, {
      section: 'Phần 5 · Bằng chứng và kết luận',
      title: 'Chứng minh tích hợp theo luồng nghiệp vụ xuyên suốt',
      subtitle:
        'Demo UI được đối chiếu với trạng thái dữ liệu và các cơ chế nội bộ để tránh kết luận chỉ dựa trên giao diện.',
      code: '28_golden_flow_evidence',
    });
    addCleanPlaceholder(s, assets.goldenFlowScreens, {
      x: 0.83,
      y: 2.55,
      w: 6.45,
      h: 3.92,
      icon: I.presentation,
      description: 'Vị trí dành cho chuỗi ảnh QR, giỏ hàng, xác nhận đơn, KDS và thanh toán kèm chú thích trạng thái.',
      chips: [
        { label: 'Customer PWA', color: C.cyan },
        { label: 'POS', color: C.emerald },
        { label: 'KDS', color: C.amber },
        { label: 'Thanh toán', color: C.rose },
      ],
    });
    addTable(
      s,
      [
        ['Bước', 'Trạng thái cần đối chiếu'],
        ['QR / Thực đơn', 'Tenant, bàn, phiên đang hoạt động'],
        ['Giỏ / Gửi đơn', 'cartVersion, một đơn PENDING'],
        ['Nhân viên xác nhận', 'PROCESSING, tồn kho, order.confirmed'],
        ['KDS', 'Ticket trong Redis theo trạm'],
        ['Thanh toán', 'Hóa đơn PAID, phiên đóng, bàn CLEANING'],
      ],
      { x: 7.55, y: 2.48, w: 4.95, rowH: 0.65, weights: [1, 2.1], bodySize: 8.9 },
    );
    addNotes(s, `Placeholder ${assets.goldenFlowScreens.id}; demo live tách khỏi 20-25 phút.`);
  }

  // 29 Evidence matrix
  {
    const s = baseSlide(pptx, {
      section: 'Phần 5 · Bằng chứng và kết luận',
      title: 'Ma trận bằng chứng và giới hạn kết luận',
      subtitle:
        'Ma trận truy vết hiện ghi nhận 52 dòng P0/P1: 38 đã bao phủ, 9 bao phủ một phần, 1 khoảng trống hiện thực và 4 nội dung hoãn theo giai đoạn.',
      code: '29_evidence_matrix',
    });
    addTable(
      s,
      [
        ['Nhóm cơ chế', 'Bằng chứng chính', 'Mức trình bày'],
        ['QR / phiên / giỏ hàng', 'Kiểm thử đơn vị, tích hợp và hook phía client', 'Tương đối mạnh'],
        ['Guard và cô lập tenant', 'Kiểm thử guard + smoke đại diện', 'Mạnh ở đường đại diện'],
        ['Order Confirm Saga', 'Đơn vị/hợp đồng + tích hợp tồn kho', 'Một phần với tiêm lỗi tích hợp'],
        ['Bản chiếu KDS', 'Kiểm thử consumer + tích hợp Redis', 'Tương đối mạnh'],
        ['Cầu nối thanh toán', 'Kiểm thử đơn vị + tích hợp liên dịch vụ', 'Mạnh ở cầu nối nội bộ'],
        ['Triển khai', 'Nền tảng Compose và giám sát', 'Chưa kết luận sẵn sàng vận hành'],
      ],
      { y: 2.4, rowH: 0.58, weights: [1.2, 1.8, 1.42], bodySize: 8.8 },
    );
    addCallout(
      s,
      'Chưa đủ bằng chứng để kết luận về tải lớn, phân phối đúng một lần, tiêm lỗi Saga toàn diện hoặc khả năng sẵn sàng vận hành công khai.',
      C.rose,
      6.52,
    );
    addNotes(s, 'Số 38/9/1/4 lấy từ phase-5-7-finalization. Không đưa exact permission count vì document drift.');
  }

  // 30 Conclusion
  {
    const s = baseSlide(pptx, {
      section: '',
      title: '',
      subtitle: '',
      code: '30_conclusion',
      photo: true,
      header: false,
    });
    s.addText('KẾT LUẬN', {
      x: 0.83,
      y: 0.62,
      w: 3,
      h: 0.22,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 11,
      color: C.cyan,
      bold: true,
      charSpacing: 1.6,
    });
    s.addText('QRTable chứng minh tính khả thi của một nền tảng POS vi dịch vụ có kiểm soát', {
      x: 0.83,
      y: 1.28,
      w: 9.6,
      h: 1.35,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 32,
      color: C.text,
      bold: true,
      fit: 'shrink',
    });
    addIconCard(s, {
      x: 0.83,
      y: 3.18,
      w: 3.72,
      h: 2.15,
      icon: I.check,
      color: C.emerald,
      title: 'Kết quả đạt được',
      body: 'Luồng xuyên suốt QR → POS → KDS → Thanh toán; ranh giới dịch vụ, guard, tính lũy đẳng và Saga đại diện có bằng chứng.',
      bodySize: 11,
    });
    addIconCard(s, {
      x: 4.82,
      y: 3.18,
      w: 3.72,
      h: 2.15,
      icon: I.alert,
      color: C.amber,
      title: 'Giới hạn trung thực',
      body: 'Chưa có phép đo tải, bằng chứng phân phối đúng một lần, bằng chứng vận hành công khai đầy đủ hoặc tiêm lỗi tích hợp cho mọi nhánh.',
      bodySize: 11,
    });
    addIconCard(s, {
      x: 8.81,
      y: 3.18,
      w: 3.72,
      h: 2.15,
      icon: I.route,
      color: C.cyan,
      title: 'Hướng phát triển',
      body: 'Đo hiệu năng, củng cố Saga và thanh toán, mở rộng kiểm thử toàn ngăn xếp, sao lưu/khôi phục và phân tích dữ liệu.',
      bodySize: 11,
    });
    s.addText(
      'Đóng góp chính không nằm ở mã QR riêng lẻ, mà ở cách tích hợp luồng F&B với các ranh giới kỹ thuật và mức bằng chứng có thể truy vết.',
      {
        x: 1.05,
        y: 5.92,
        w: 11.2,
        h: 0.48,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 13,
        color: C.cyan,
        bold: true,
        align: 'center',
        fit: 'shrink',
      },
    );
    addNotes(s, 'Kết thúc phần trình bày chính. Sau đó chuyển sang demo riêng nếu lịch bảo vệ cho phép.');
  }

  // Appendix 31-40
  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục A',
      title: 'Chi tiết ranh giới dịch vụ',
      subtitle: 'Bảng dự phòng khi hội đồng hỏi dịch vụ nào sở hữu hành vi và dữ liệu nào.',
      code: '31_service_boundary',
    });
    addTable(
      s,
      [
        ['Ranh giới', 'Kênh chính', 'Dữ liệu sở hữu', 'Vai trò'],
        ['BFF', 'HTTP / WebSocket', 'Không có CSDL nghiệp vụ', 'Chuỗi guard, proxy, biên thời gian thực'],
        ['Authorizer', 'gRPC', 'Định danh / tích hợp Keycloak', 'Xác minh JWT và quản trị định danh'],
        ['Catalog', 'TCP', 'Menu, table, QR, stock', 'Dịch vụ duy nhất ghi stock'],
        ['Order', 'TCP / Kafka consumer', 'Session, cart, order, bill', 'Vòng đời đơn và hóa đơn'],
        ['Kitchen', 'Kafka / Redis', 'KDS projection', 'Hàng đợi theo trạm'],
        ['Payment', 'TCP / Webhook / Kafka', 'Transaction, settings', 'Cash, VietQR, SePay'],
        ['SaaS', 'TCP', 'Tenant, plan, subscription', 'Vòng đời đơn vị thuê bao'],
        ['User-Access', 'TCP / MongoDB', 'Profile, role, staff', 'Hồ sơ và vai trò ứng dụng'],
      ],
      { y: 2.25, rowH: 0.49, weights: [0.82, 1.05, 1.5, 1.9], bodySize: 7.8, headerSize: 7.8 },
    );
    addNotes(s, 'Phụ lục dùng để trả lời câu hỏi về ranh giới và quyền sở hữu dữ liệu.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục B',
      title: 'Quyền sở hữu dữ liệu và tham chiếu ngoài miền',
      subtitle: 'Ranh giới dữ liệu không sử dụng khóa ngoại hoặc truy vấn kết hợp xuyên dịch vụ.',
      code: '32_database_ownership',
    });
    addCleanPlaceholder(s, assets.serviceOwnership, {
      x: 0.83,
      y: 2.55,
      w: 7.2,
      h: 3.95,
      icon: I.dbBackup,
      description: 'Vị trí dành cho bản đồ quyền sở hữu hoặc các lược đồ dữ liệu theo từng dịch vụ.',
      chips: [
        { label: 'Lược đồ theo dịch vụ', color: C.cyan },
        { label: 'Tham chiếu ngoài miền', color: C.amber },
      ],
    });
    s.addText('Quy tắc trả lời phản biện', {
      x: 8.45,
      y: 2.62,
      w: 3.8,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 16,
      color: C.cyan,
      bold: true,
    });
    s.addText(
      [
        { text: 'tenant_id xác định phạm vi, không phải khóa ngoại xuyên dịch vụ.', options: { bullet: true, breakLine: true } },
        { text: 'bill_id hoặc payment_id có thể là tham chiếu ngoài miền.', options: { bullet: true, breakLine: true } },
        { text: 'Tính nhất quán giữa các dịch vụ đi qua hợp đồng hoặc sự kiện.', options: { bullet: true } },
      ],
      { x: 8.45, y: 3.18, w: 3.65, h: 2.1, margin: 0, fontFace: FONT.sans, fontSize: 11.4, color: C.muted, paraSpaceAfterPt: 12 },
    );
    addNotes(s, 'Không dùng ERD cũ làm source of truth nếu chưa đối chiếu entity/schema hiện tại.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục C',
      title: 'Chuỗi guard và các lớp kiểm soát',
      subtitle: 'Trình tự guard phản ánh các câu hỏi kiểm soát khác nhau trước khi yêu cầu đi vào dịch vụ nghiệp vụ.',
      code: '33_guard_chain',
    });
    addFlow(
      s,
      [
        { icon: I.key, title: 'UserGuard', body: 'Identity và token', color: C.cyan },
        { icon: I.building, title: 'TenantGuard', body: 'Tenant context', color: C.emerald },
        { icon: I.shield, title: 'PermissionGuard', body: 'RBAC permission', color: C.rose },
        { icon: I.receipt, title: 'Subscription context', body: 'Trạng thái gói', color: C.amber },
        { icon: I.sliders, title: 'PlanFeatureGuard', body: 'Feature entitlement', color: C.cyan },
      ],
      { y: 2.72, h: 2.7 },
    );
    addCallout(s, 'Customer session sử dụng guard riêng; Super Admin chỉ bypass trong các trường hợp được thiết kế rõ.');
    addNotes(s, 'Không đưa exact permission count do drift tài liệu.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục D',
      title: 'Danh mục chủ đề Kafka',
      subtitle: 'Năm chủ đề chuẩn được định nghĩa tập trung trong thư viện hằng số.',
      code: '34_kafka_registry',
    });
    addTable(
      s,
      [
        ['Topic', 'Producer', 'Consumer / tác dụng phụ'],
        ['order.confirmed', 'Order', 'Kitchen tạo KDS projection'],
        ['order.status_changed', 'Order', 'Bridge hoặc client update phù hợp'],
        ['payment.completed', 'Payment', 'Order hoàn tất bill/session; BFF realtime'],
        ['kitchen.sla_warning', 'Kitchen', 'BFF realtime và cảnh báo vận hành'],
        ['tenant.created', 'SaaS', 'Catalog hoặc tác dụng phụ cấp phát'],
      ],
      { y: 2.48, rowH: 0.67, weights: [1.1, 1, 2.15], bodySize: 9.2 },
    );
    addNotes(s, 'Canonical source: libs/constants/src/lib/kafka-topic.constants.ts.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục E',
      title: 'Bản đồ sử dụng Redis',
      subtitle: 'Redis phục vụ nhiều vai trò nhưng không phải nguồn sự thật chung cho toàn hệ thống.',
      code: '35_redis_usage',
    });
    addTable(
      s,
      [
        ['Phạm vi', 'Vai trò', 'Nguồn dữ liệu đúng'],
        ['Customer session / cart', 'Trạng thái phiên khi vận hành và giỏ dùng chung', 'Order domain'],
        ['KDS', 'Ticket, queue, index và dedupe', 'Order event + Kitchen projection'],
        ['Menu cache', 'Tăng tốc đường đọc thực đơn công khai', 'Catalog database'],
        ['Auth cache', 'Cache kết quả xác minh token', 'Authorizer / Keycloak'],
        ['Realtime', 'Pub/Sub hoặc hint cập nhật', 'Domain state tương ứng'],
      ],
      { y: 2.48, rowH: 0.67, weights: [1.2, 1.9, 1.6], bodySize: 9.2 },
    );
    addNotes(s, 'Nếu Redis mất, khả năng phục hồi khác nhau theo domain; không claim Redis là durable source of truth.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục F',
      title: 'Order Confirm Saga: sơ đồ chi tiết',
      subtitle: 'Dùng khi hội đồng hỏi trực tiếp về nhánh lỗi sau khi Catalog đã trừ tồn kho.',
      code: '36_saga_detail',
    });
    addCleanPlaceholder(s, assets.orderConfirmSaga, {
      x: 0.83,
      y: 2.52,
      w: 11.67,
      h: 4.0,
      icon: I.workflow,
      description: 'Vị trí dành cho sơ đồ chi tiết hơn slide chính: lệnh, khóa lũy đẳng, outbox và nhánh bù trừ.',
      chips: [
        { label: 'confirm-order:{orderId}', color: C.cyan },
        { label: 'order.confirmed', color: C.emerald },
        { label: 'confirm-order-compensation', color: C.amber },
      ],
    });
    addNotes(s, `Asset ${assets.orderConfirmSaga.id}; phụ lục dành cho câu hỏi về các nhánh lỗi.`);
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục G',
      title: 'Cầu nối thanh toán và hoàn tất phiên',
      subtitle: 'Chi tiết đường sự kiện từ Payment tới Order và hành vi khi sự kiện bị phát lại.',
      code: '37_payment_detail',
    });
    addFlow(
      s,
      [
        { icon: I.credit, title: 'Payment record', body: 'Payment xác định settlement hợp lệ.', color: C.emerald },
        { icon: I.message, title: 'Outbox', body: 'Ghi payment.completed sau transaction cục bộ.', color: C.cyan },
        { icon: I.cable, title: 'Order consumer', body: 'Parse payload và gọi BillService.markPaid.', color: C.amber },
        { icon: I.receipt, title: 'Idempotent finalization', body: 'Bill đã PAID vẫn hoàn tất side effect còn thiếu.', color: C.rose },
        { icon: I.table, title: 'Session / table', body: 'Xóa session/cart và chuyển bàn sang CLEANING.', color: C.emerald },
      ],
      { y: 2.72, h: 2.72, bodySize: 9.8, titleSize: 13.2 },
    );
    addNotes(s, 'Bám payment-events-consumer, BillService và integration bridge test.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục H',
      title: 'Vị trí hiện vật: trạng thái, log/trace và kết quả kiểm thử',
      subtitle: 'Ba vùng này dành cho hiện vật thực tế được thu và kiểm tra trước buổi bảo vệ.',
      code: '38_evidence_assets',
    });
    const evidence = [
      [assets.dbStateEvidence, I.database, 0.83, C.emerald],
      [assets.logTraceEvidence, I.logs, 4.83, C.amber],
      [assets.testOutputEvidence, I.test, 8.83, C.cyan],
    ];
    evidence.forEach(([asset, icon, x, color]) => {
      addCard(s, x, 2.58, 3.68, 3.9, { fill: C.surfaceAlt, line: C.borderStrong });
      addIcon(s, icon, x + 1.48, 3.05, 0.72);
      s.addText(asset.caption, {
        x: x + 0.28,
        y: 4.02,
        w: 3.12,
        h: 0.44,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 15.2,
        color,
        bold: true,
        align: 'center',
        fit: 'shrink',
      });
      s.addText(asset.purpose, {
        x: x + 0.35,
        y: 4.7,
        w: 2.98,
        h: 0.82,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 10.6,
        color: C.muted,
        align: 'center',
        fit: 'shrink',
      });
      s.addText('Mở nguồn tham chiếu', {
        x: x + 0.65,
        y: 5.98,
        w: 2.38,
        h: 0.16,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 8,
        color: C.dim,
        align: 'center',
        hyperlink: { url: fileUrl(asset.sourceLinks[0]), tooltip: asset.sourceLinks[0] },
      });
    });
    addNotes(s, 'Chi tiết asset ID và replacement instructions nằm trong asset-registry.json.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục I',
      title: 'Tổng quan mức độ truy vết',
      subtitle: 'Số liệu tóm tắt phục vụ trình bày; ma trận đầy đủ vẫn nằm trong tài liệu kiểm thử.',
      code: '39_traceability',
    });
    const metrics = [
      [I.check, C.emerald, '38', 'Đã bao phủ'],
      [I.alert, C.amber, '9', 'Bao phủ một phần'],
      [I.shieldAlert, C.rose, '1', 'Khoảng trống hiện thực'],
      [I.route, C.cyan, '4', 'Hoãn theo giai đoạn'],
    ];
    metrics.forEach(([icon, color, number, label], i) => {
      const x = 0.83 + i * 3.05;
      addIcon(s, icon, x + 0.88, 2.62, 0.66);
      s.addText(number, {
        x,
        y: 3.55,
        w: 2.42,
        h: 0.7,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 34,
        color,
        bold: true,
        align: 'center',
      });
      s.addText(label, {
        x,
        y: 4.42,
        w: 2.42,
        h: 0.52,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 11.5,
        color: C.text,
        bold: true,
        align: 'center',
        fit: 'shrink',
      });
    });
    addCallout(s, 'Tổng cộng 52 dòng P0/P1; các dòng bao phủ một phần còn cần dữ liệu kiểm thử, bằng chứng toàn ngăn xếp hoặc trường hợp biên cụ thể.');
    addNotes(s, 'Nguồn: docs/phases/phase-5-7-finalization.md. Không dùng exact permission count.');
  }

  {
    const s = baseSlide(pptx, {
      section: 'Phụ lục J',
      title: 'Các câu hỏi phản biện cần trả lời ngắn gọn',
      subtitle: 'Bảng này chỉ mở khi hội đồng đặt câu hỏi; không nằm trong mạch nói chính.',
      code: '40_reviewer_questions',
    });
    addTable(
      s,
      [
        ['Câu hỏi', 'Trả lời trọng tâm'],
        ['Tại sao không dùng kiến trúc nguyên khối mô-đun?', 'Ranh giới miền nghiệp vụ phù hợp với vi dịch vụ, nhưng QRTable thừa nhận chi phí phân tán và không coi đây là lựa chọn duy nhất.'],
        ['WebSocket có phải nguồn sự thật?', 'Không. WebSocket chỉ phát tín hiệu cập nhật; client tải lại trạng thái từ dịch vụ sở hữu dữ liệu.'],
        ['Điều gì xảy ra nếu đã trừ tồn kho rồi Order lỗi?', 'Order gọi Catalog hoàn tồn kho bằng khóa lũy đẳng bù trừ; kiểm thử đơn vị/hợp đồng đã xác minh, tiêm lỗi tích hợp đầy đủ còn thiếu.'],
        ['Hệ thống đã sẵn sàng vận hành thực tế chưa?', 'Chưa kết luận. Repo có nền tảng triển khai và giám sát, nhưng còn thiếu bằng chứng vận hành công khai, đo tải, sao lưu/khôi phục và gia cố bảo mật.'],
        ['Đóng góp của đề tài nằm ở đâu?', 'Ở mô hình tích hợp luồng F&B, ranh giới dịch vụ, cơ chế phân tán và bộ bằng chứng truy vết, không phải ở mã QR riêng lẻ.'],
      ],
      { y: 2.3, rowH: 0.76, weights: [1.2, 2.7], bodySize: 8.8, headerSize: 8.5 },
    );
    addNotes(s, 'Appendix cuối cho phản biện. Không đọc trong phần trình bày chính.');
  }

  await pptx.writeFile({ fileName: pptxPath });
  fs.writeFileSync(registryPath, JSON.stringify(assets, null, 2), 'utf8');
  console.log(`Wrote ${pptxPath}`);
  console.log(`Wrote ${registryPath}`);
}

buildDeck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
