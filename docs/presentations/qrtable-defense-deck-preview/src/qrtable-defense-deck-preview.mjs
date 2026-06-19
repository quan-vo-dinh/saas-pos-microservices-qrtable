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
  Boxes,
  Building2,
  CheckCircle2,
  Database,
  DatabaseZap,
  FileSearch,
  KeyRound,
  Network,
  QrCode,
  RadioTower,
  RefreshCw,
  Scale,
  ShieldCheck,
  Workflow,
} = require('lucide-react');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(previewRoot, '../../..');
const outputDir = path.join(previewRoot, 'output');
const pptxPath = path.join(outputDir, 'qrtable-defense-deck-preview.pptx');
const registryPath = path.join(outputDir, 'asset-registry.json');

const W = 13.333;
const H = 7.5;

const C = {
  bg: '09090B',
  surface: '18181B',
  surfaceAlt: '111114',
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
  supervisor: 'TS. Nguyễn Thanh Bình',
  year: '2026',
};

const assets = {
  schoolLogo: {
    id: 'GLOBAL_SCHOOL_LOGO',
    type: 'logo',
    status: 'user-replacement',
    purpose: 'Nhận diện chính thức của Trường Đại học Công nghệ Thông tin',
    sourceLinks: ['Asset logo chính thức do người dùng cung cấp hoặc nguồn trường đã kiểm chứng'],
    replacementInstructions:
      'Thay ô logo trên bìa bằng logo UIT chính thức; giữ nguyên tỉ lệ, không đổi màu logo trái guideline.',
    aspectRatio: 'preserve',
  },
  orderConfirmSaga: {
    id: 'SLIDE_ORDER_CONFIRM_SAGA',
    type: 'diagram',
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
      'docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter5-order-confirm-stock.mmd',
      'docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf',
      'docs/testing/phase-5/saga-validation-strategy.md',
      'apps/order/src/app/modules/order/services/order-confirm-saga.service.ts',
    ],
    replacementInstructions:
      'Thay vùng visual bằng sequence/state diagram riêng. Giữ đủ happy path, lỗi sau khi trừ tồn kho, compensation và idempotency boundary.',
    aspectRatio: 'wide',
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
    React.createElement(Icon, {
      color: `#${color}`,
      size: 256,
      strokeWidth: 2,
    }),
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `image/png;base64,${png.toString('base64')}`;
}

function addBackground(slide) {
  slide.background = { color: C.bg };
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: { color: C.bg },
    line: { color: C.bg },
  });
  slide.addImage({
    data: gradientStripData(),
    x: 0,
    y: 7.415,
    w: W,
    h: 0.085,
  });
}

function addHeader(slide, section, title, subtitle) {
  slide.addText(section.toUpperCase(), {
    x: 0.83,
    y: 0.58,
    w: 9.7,
    h: 0.22,
    margin: 0,
    fontFace: FONT.mono,
    fontSize: 11.5,
    color: C.cyan,
    bold: true,
    charSpacing: 1.8,
  });
  slide.addText(title, {
    x: 0.83,
    y: 1.06,
    w: 11.65,
    h: 0.62,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 31.5,
    color: C.text,
    bold: true,
    fit: 'shrink',
  });
  slide.addText(subtitle, {
    x: 0.83,
    y: 1.83,
    w: 11.5,
    h: 0.38,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 17,
    color: C.muted,
    fit: 'shrink',
  });
}

function addFooter(slide, label, slideCode) {
  slide.addText(label, {
    x: 0.83,
    y: 7.14,
    w: 5.6,
    h: 0.16,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 8.5,
    color: C.muted,
  });
  slide.addText(slideCode, {
    x: 10.15,
    y: 7.14,
    w: 2.35,
    h: 0.16,
    margin: 0,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: C.muted,
    align: 'right',
  });
}

function addIcon(slide, data, x, y, size) {
  slide.addImage({ data, x, y, w: size, h: size });
}

function addCard(slide, { x, y, w, h, icon, color, title, body, centered = false }) {
  slide.addShape('rect', {
    x,
    y,
    w,
    h,
    fill: { color: C.surface },
    line: { color: C.border, width: 0.8 },
  });
  addIcon(slide, icon, x + 0.2, y + 0.2, 0.32);
  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.76,
    w: w - 0.4,
    h: 0.48,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 16.5,
    color: centered ? color : C.text,
    bold: true,
    align: centered ? 'center' : 'left',
    fit: 'shrink',
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + 1.35,
    w: w - 0.4,
    h: h - 1.58,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 12.5,
    color: C.muted,
    align: centered ? 'center' : 'left',
    valign: 'top',
    breakLine: false,
    fit: 'shrink',
    paraSpaceAfterPt: 5,
  });
}

function addDriver(slide, { x, icon, color, title, body }) {
  addIcon(slide, icon, x + 0.87, 2.72, 0.68);
  slide.addText(title, {
    x,
    y: 3.68,
    w: 2.42,
    h: 0.52,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 18,
    color: C.text,
    bold: true,
    align: 'center',
    fit: 'shrink',
  });
  slide.addText(body, {
    x,
    y: 4.37,
    w: 2.42,
    h: 1.35,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 12.5,
    color: C.muted,
    align: 'center',
    valign: 'top',
    fit: 'shrink',
  });
}

function addDecisionCard(slide, { x, y, icon, color, title, body, tag }) {
  slide.addShape('rect', {
    x,
    y,
    w: 5.72,
    h: 1.82,
    fill: { color: C.surface },
    line: { color: C.border, width: 0.8 },
  });
  addIcon(slide, icon, x + 0.25, y + 0.24, 0.34);
  slide.addText(tag.toUpperCase(), {
    x: x + 0.77,
    y: y + 0.28,
    w: 1.4,
    h: 0.18,
    margin: 0,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color,
    bold: true,
    charSpacing: 1,
  });
  slide.addText(title, {
    x: x + 0.25,
    y: y + 0.72,
    w: 5.2,
    h: 0.36,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 16.5,
    color: C.text,
    bold: true,
    fit: 'shrink',
  });
  slide.addText(body, {
    x: x + 0.25,
    y: y + 1.18,
    w: 5.2,
    h: 0.44,
    margin: 0,
    fontFace: FONT.sans,
    fontSize: 11.8,
    color: C.muted,
    fit: 'shrink',
  });
}

function addNotes(slide, notes) {
  slide.addNotes(notes.trim());
}

async function createDeck() {
  fs.mkdirSync(outputDir, { recursive: true });

  const icons = {
    alert: await iconData(AlertTriangle, C.rose),
    boxes: await iconData(Boxes, C.emerald),
    building: await iconData(Building2, C.cyan),
    check: await iconData(CheckCircle2, C.emerald),
    database: await iconData(Database, C.emerald),
    databaseZap: await iconData(DatabaseZap, C.amber),
    evidence: await iconData(FileSearch, C.cyan),
    key: await iconData(KeyRound, C.rose),
    network: await iconData(Network, C.cyan),
    qr: await iconData(QrCode, C.cyan),
    realtime: await iconData(RadioTower, C.emerald),
    refresh: await iconData(RefreshCw, C.rose),
    scale: await iconData(Scale, C.amber),
    shield: await iconData(ShieldCheck, C.rose),
    workflow: await iconData(Workflow, C.cyan),
  };

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = thesis.author;
  pptx.subject = 'QRTable thesis defense deck design preview';
  pptx.title = 'QRTable Defense Deck - 5 Slide Design Preview';
  pptx.company = 'University of Information Technology';
  pptx.lang = 'vi-VN';
  pptx.theme = {
    headFontFace: FONT.sans,
    bodyFontFace: FONT.sans,
    lang: 'vi-VN',
  };
  pptx.defineLayout({ name: 'QR_WIDE', width: W, height: H });
  pptx.layout = 'QR_WIDE';

  // 1. Cover
  {
    const slide = pptx.addSlide();
    addBackground(slide);
    slide.addText('KHÓA LUẬN TỐT NGHIỆP · 2026', {
      x: 0.83,
      y: 0.62,
      w: 5.5,
      h: 0.23,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 11.5,
      color: C.cyan,
      bold: true,
      charSpacing: 1.8,
    });
    slide.addText(thesis.title, {
      x: 0.83,
      y: 1.45,
      w: 8.45,
      h: 2.2,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 31.5,
      color: C.text,
      bold: true,
      breakLine: false,
      fit: 'shrink',
      valign: 'mid',
    });
    slide.addText('SaaS POS · Đặt món qua mã QR · Kiến trúc vi dịch vụ', {
      x: 0.83,
      y: 4.02,
      w: 7.2,
      h: 0.35,
      margin: 0,
      fontFace: FONT.mono,
      fontSize: 11.5,
      color: C.emerald,
      bold: true,
    });
    slide.addShape('rect', {
      x: 9.68,
      y: 1.18,
      w: 2.72,
      h: 2.72,
      fill: { color: C.surfaceAlt },
      line: { color: C.borderStrong, width: 1, dash: 'dash' },
    });
    addIcon(slide, icons.qr, 10.56, 1.82, 0.96);
    slide.addText('Logo / biểu trưng\nsẽ được thay tại đây', {
      x: 9.98,
      y: 3.07,
      w: 2.12,
      h: 0.52,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 10.5,
      color: C.dim,
      align: 'center',
      valign: 'mid',
    });
    slide.addText(`${thesis.author} · MSSV ${thesis.studentId}`, {
      x: 0.83,
      y: 5.42,
      w: 5.8,
      h: 0.31,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 14.5,
      color: C.text,
      bold: true,
    });
    slide.addText(`${thesis.faculty} · Giảng viên hướng dẫn: ${thesis.supervisor}`, {
      x: 0.83,
      y: 5.89,
      w: 7.9,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 12.5,
      color: C.muted,
    });
    addFooter(slide, 'QRTable Thesis Defense Deck', '01_cover');
    addNotes(
      slide,
      `
Mở đầu bằng tên đề tài chính thức, không thêm claim kỹ thuật.

Asset cần thay:
- ${assets.schoolLogo.id}
- ${assets.schoolLogo.replacementInstructions}
      `,
    );
  }

  // 2. Problem statement
  {
    const slide = pptx.addSlide();
    addBackground(slide);
    addHeader(
      slide,
      'Phần 1 · Bối cảnh và bài toán',
      'Bài toán hệ thống đặt ra',
      'Bài toán nằm ở việc phối hợp dữ liệu, trạng thái và quyền truy cập trong toàn bộ quy trình phục vụ.',
    );
    const gap = 0.18;
    const cardW = (11.67 - gap * 3) / 4;
    const x0 = 0.83;
    const y = 2.78;
    const h = 3.47;
    addCard(slide, {
      x: x0,
      y,
      w: cardW,
      h,
      icon: icons.building,
      color: C.cyan,
      title: 'Cô lập đơn vị thuê bao',
      body:
        'Mỗi nhà hàng có dữ liệu, cấu hình và phạm vi truy cập riêng. Mọi yêu cầu phải duy trì đúng ngữ cảnh đơn vị thuê bao.',
    });
    addCard(slide, {
      x: x0 + cardW + gap,
      y,
      w: cardW,
      h,
      icon: icons.realtime,
      color: C.emerald,
      title: 'Phối hợp trạng thái vận hành',
      body:
        'Đơn hàng thay đổi qua Customer, POS và KDS. Các client cần nhận tín hiệu cập nhật nhưng vẫn tải lại trạng thái từ nguồn dữ liệu đúng.',
    });
    addCard(slide, {
      x: x0 + (cardW + gap) * 2,
      y,
      w: cardW,
      h,
      icon: icons.databaseZap,
      color: C.amber,
      title: 'Nhất quán giữa các dịch vụ',
      body:
        'Order, tồn kho và thanh toán thuộc các ranh giới khác nhau. Lỗi một phần không được để lại trạng thái nghiệp vụ sai hoặc tác dụng phụ lặp.',
    });
    addCard(slide, {
      x: x0 + (cardW + gap) * 3,
      y,
      w: cardW,
      h,
      icon: icons.shield,
      color: C.rose,
      title: 'Kiểm soát truy cập nhiều lớp',
      body:
        'Nhân viên, chủ quán, quản trị nền tảng và khách qua QR sử dụng các cơ chế xác thực, phân quyền và giới hạn phạm vi khác nhau.',
    });
    addFooter(slide, 'QRTable Thesis Defense Deck', '02_problem_statement');
    addNotes(
      slide,
      `
Thông điệp chính: QRTable là bài toán phối hợp trạng thái và ranh giới hệ thống, không chỉ là một giao diện gọi món.

Không dùng các claim chưa có bằng chứng như "cô lập tuyệt đối", "chịu tải lớn" hoặc "fault isolation hoàn chỉnh".
      `,
    );
  }

  // 3. Architecture drivers
  {
    const slide = pptx.addSlide();
    addBackground(slide);
    addHeader(
      slide,
      'Phần 2 · Phân tích và thiết kế kiến trúc',
      'Các động lực kiến trúc của QRTable',
      'Bốn yêu cầu xuyên suốt chi phối cách phân rã dịch vụ, lựa chọn kênh giao tiếp và tổ chức các lớp kiểm soát.',
    );
    addDriver(slide, {
      x: 0.83,
      icon: icons.building,
      color: C.cyan,
      title: 'Đa đơn vị thuê bao',
      body:
        'Dữ liệu, phiên làm việc, bộ nhớ đệm và quyền truy cập phải luôn gắn với đúng đơn vị thuê bao.',
    });
    addDriver(slide, {
      x: 3.88,
      icon: icons.realtime,
      color: C.emerald,
      title: 'Gần thời gian thực',
      body:
        'POS, KDS và client khách cần nhận thay đổi nhanh, nhưng WebSocket chỉ đóng vai trò tín hiệu cập nhật.',
    });
    addDriver(slide, {
      x: 6.93,
      icon: icons.scale,
      color: C.amber,
      title: 'Nhất quán phân tán',
      body:
        'Mỗi dịch vụ sở hữu dữ liệu riêng; hệ thống cần xử lý retry, thông điệp trùng và lỗi từng phần có kiểm soát.',
    });
    addDriver(slide, {
      x: 9.98,
      icon: icons.key,
      color: C.rose,
      title: 'Phân quyền nhiều lớp',
      body:
        'RBAC, cô lập đơn vị thuê bao, quyền lợi theo gói và quyền quản trị nền tảng là các lớp kiểm soát riêng biệt.',
    });
    slide.addText(
      'Các động lực này dẫn tới một kiến trúc có ranh giới dịch vụ rõ, giao tiếp có chọn lọc và bằng chứng kiểm chứng theo từng cơ chế.',
      {
        x: 1.2,
        y: 6.18,
        w: 10.93,
        h: 0.34,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 13,
        color: C.cyan,
        bold: true,
        align: 'center',
        fit: 'shrink',
      },
    );
    addFooter(slide, 'QRTable Thesis Defense Deck', '03_architecture_drivers');
    addNotes(
      slide,
      `
Đây là slide dẫn nhập cho phần kiến trúc. Không trình bày công nghệ ở đây.

Thuật ngữ nói:
- "đa đơn vị thuê bao" thay cho việc lặp lại "multi-tenant";
- "gần thời gian thực" thay vì khẳng định real-time tuyệt đối;
- "nhất quán phân tán" gắn với retry, duplicate và lỗi từng phần;
- phân biệt RBAC, tenant isolation và plan entitlement.
      `,
    );
  }

  // 4. Microservices decision
  {
    const slide = pptx.addSlide();
    addBackground(slide);
    addHeader(
      slide,
      'Phần 2 · Phân tích và thiết kế kiến trúc',
      'Cơ sở lựa chọn kiến trúc vi dịch vụ cho QRTable',
      'Lựa chọn này phù hợp với ranh giới nghiệp vụ của hệ thống, nhưng chỉ có ý nghĩa khi các chi phí phân tán được xử lý có chủ đích.',
    );
    addDecisionCard(slide, {
      x: 0.83,
      y: 2.62,
      icon: icons.boxes,
      color: C.emerald,
      tag: 'Cơ sở lựa chọn',
      title: 'Ranh giới nghiệp vụ có thể phân tách',
      body:
        'Catalog, Order, Kitchen, Payment và User-Access có trách nhiệm và vòng đời dữ liệu khác nhau.',
    });
    addDecisionCard(slide, {
      x: 6.78,
      y: 2.62,
      icon: icons.database,
      color: C.emerald,
      tag: 'Cơ sở lựa chọn',
      title: 'Quyền sở hữu dữ liệu được xác định rõ',
      body:
        'Mỗi dịch vụ quản lý dữ liệu của mình; dịch vụ khác tương tác qua hợp đồng thay vì truy cập cơ sở dữ liệu chéo.',
    });
    addDecisionCard(slide, {
      x: 0.83,
      y: 4.68,
      icon: icons.network,
      color: C.amber,
      tag: 'Chi phí phát sinh',
      title: 'Giao tiếp và nhất quán trở nên phức tạp hơn',
      body:
        'Hệ thống phải lựa chọn giữa lời gọi đồng bộ, sự kiện bất đồng bộ, tính lũy đẳng, loại trùng và bù trừ.',
    });
    addDecisionCard(slide, {
      x: 6.78,
      y: 4.68,
      icon: icons.alert,
      color: C.rose,
      tag: 'Chi phí phát sinh',
      title: 'Kiểm thử và vận hành cần nhiều lớp bằng chứng',
      body:
        'Một giao diện hoạt động chưa đủ chứng minh ranh giới dịch vụ, nhánh lỗi, trạng thái dữ liệu và hành vi khi phát lại.',
    });
    slide.addText(
      'QRTable xem vi dịch vụ là một quyết định thiết kế gắn với ranh giới nghiệp vụ và cơ chế kiểm soát lỗi phân tán, không phải mục tiêu tự thân.',
      {
        x: 1.1,
        y: 6.72,
        w: 11.15,
        h: 0.31,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 12.7,
        color: C.cyan,
        bold: true,
        align: 'center',
        fit: 'shrink',
      },
    );
    addFooter(slide, 'QRTable Thesis Defense Deck', '04_microservices_decision');
    addNotes(
      slide,
      `
Trình bày quyết định theo hai vế: lý do phù hợp và chi phí phát sinh.

Không nói vi dịch vụ "tốt hơn" kiến trúc nguyên khối trong mọi trường hợp.
Không claim mở rộng độc lập hoặc cô lập lỗi đã được đo lường nếu chưa có benchmark và hiện vật vận hành tương ứng.
      `,
    );
  }

  // 5. Order Confirm Saga
  {
    const slide = pptx.addSlide();
    addBackground(slide);
    addHeader(
      slide,
      'Phần 4 · Cơ chế cốt lõi',
      'Order Confirm Saga: xác nhận đơn hàng và bảo toàn tồn kho',
      'Saga đại diện cho cách QRTable phối hợp một giao dịch nghiệp vụ đi qua Order và Catalog mà không sử dụng một transaction cơ sở dữ liệu chung.',
    );

    slide.addShape('rect', {
      x: 0.83,
      y: 2.62,
      w: 7.75,
      h: 3.92,
      fill: { color: C.surfaceAlt },
      line: { color: C.borderStrong, width: 1, dash: 'dash' },
    });
    addIcon(slide, icons.workflow, 4.27, 3.24, 0.84);
    slide.addText('Sơ đồ trình tự Order Confirm Saga', {
      x: 1.45,
      y: 4.2,
      w: 6.5,
      h: 0.42,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 18,
      color: C.text,
      bold: true,
      align: 'center',
    });
    slide.addText(
      'Visual sẽ được thay bằng diagram riêng; bố cục cuối cần thể hiện đầy đủ luồng thành công, nhánh lỗi sau khi trừ tồn kho và hành động bù trừ.',
      {
        x: 1.5,
        y: 4.82,
        w: 6.4,
        h: 0.62,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 11.5,
        color: C.muted,
        align: 'center',
        fit: 'shrink',
      },
    );
    const chips = [
      ['Luồng thành công', C.emerald],
      ['Nhánh lỗi', C.rose],
      ['Bù trừ', C.amber],
      ['Biên idempotency', C.cyan],
    ];
    chips.forEach(([label, color], i) => {
      const x = 1.28 + i * 1.75;
      slide.addShape('rect', {
        x,
        y: 5.72,
        w: 1.55,
        h: 0.34,
        fill: { color, transparency: 88 },
        line: { color, transparency: 25, width: 0.7 },
      });
      slide.addText(label, {
        x: x + 0.05,
        y: 5.81,
        w: 1.45,
        h: 0.14,
        margin: 0,
        fontFace: FONT.mono,
        fontSize: 7.5,
        color,
        bold: true,
        align: 'center',
        fit: 'shrink',
      });
    });
    const sagaFigureUrl = pathToFileURL(
      path.join(
        repoRoot,
        'docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf',
      ),
    ).href;
    slide.addText('Mở nguồn sơ đồ trong báo cáo', {
      x: 1.18,
      y: 6.25,
      w: 4.5,
      h: 0.18,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 8.5,
      color: C.dim,
      hyperlink: {
        url: sagaFigureUrl,
        tooltip: 'Hình 5.2 - Order Confirm Saga',
      },
    });

    const sideX = 8.95;
    slide.addText('Bất biến cần bảo vệ', {
      x: sideX,
      y: 2.66,
      w: 3.5,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 15.5,
      color: C.cyan,
      bold: true,
    });
    slide.addText(
      'Catalog là dịch vụ duy nhất cập nhật tồn kho; Order chỉ chuyển sang PROCESSING sau khi tồn kho được xử lý thành công; xác nhận lặp không được trừ tồn kho hai lần.',
      {
        x: sideX,
        y: 3.08,
        w: 3.52,
        h: 1.12,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 11.5,
        color: C.muted,
        fit: 'shrink',
      },
    );
    slide.addText('Điểm ghi nhận nghiệp vụ', {
      x: sideX,
      y: 4.38,
      w: 3.5,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 15.5,
      color: C.emerald,
      bold: true,
    });
    slide.addText(
      'Order ghi trạng thái PROCESSING cùng outbox order.confirmed. Nếu bước này thất bại sau khi Catalog đã trừ tồn kho, Order gọi Catalog hoàn tồn kho.',
      {
        x: sideX,
        y: 4.8,
        w: 3.52,
        h: 0.92,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 11.5,
        color: C.muted,
        fit: 'shrink',
      },
    );
    slide.addText('Mức bằng chứng hiện tại', {
      x: sideX,
      y: 5.93,
      w: 3.5,
      h: 0.3,
      margin: 0,
      fontFace: FONT.sans,
      fontSize: 15.5,
      color: C.amber,
      bold: true,
    });
    slide.addText(
      'Kiểm thử đơn vị và hợp đồng đã kiểm chứng điều phối, phát lại và bù trừ. Tiêm lỗi xác định trên toàn ngăn xếp vẫn là bước củng cố tiếp theo.',
      {
        x: sideX,
        y: 6.35,
        w: 3.52,
        h: 0.62,
        margin: 0,
        fontFace: FONT.sans,
        fontSize: 10.8,
        color: C.muted,
        fit: 'shrink',
      },
    );
    addFooter(slide, 'QRTable Thesis Defense Deck', '05_order_confirm_saga');
    addNotes(
      slide,
      `
Placeholder là chủ đích và sẽ được giữ cho tới khi người dùng thay diagram riêng.

Asset: ${assets.orderConfirmSaga.id}
Mục đích: ${assets.orderConfirmSaga.purpose}
Nội dung bắt buộc:
- ${assets.orderConfirmSaga.requiredContent.join('\n- ')}

Nguồn:
- ${assets.orderConfirmSaga.sourceLinks.join('\n- ')}

Hướng dẫn thay:
${assets.orderConfirmSaga.replacementInstructions}

Claim được phép:
- Có bằng chứng unit/contract cho orchestration, replay, Catalog error và compensation.
- Có opt-in integration cho ranh giới tồn kho Order-Catalog.

Không claim:
- Full production-grade Saga hardening.
- Exactly-once messaging.
- Live deterministic fault injection đầy đủ trên toàn ngăn xếp.
      `,
    );
  }

  await pptx.writeFile({ fileName: pptxPath });
  fs.writeFileSync(registryPath, JSON.stringify(assets, null, 2), 'utf8');
  console.log(`Wrote ${pptxPath}`);
  console.log(`Wrote ${registryPath}`);
}

createDeck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
