import fs from 'node:fs/promises';
import path from 'node:path';

const workspace =
  process.env.QRTABLE_DECK_WORKSPACE ||
  '/private/tmp/codex-presentations/qrtable-thesis-architecture';

const slidesDir = path.join(workspace, 'slides');

const utils = String.raw`
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';

export const W = 1280;
export const H = 720;
export const C = {
  bg: '#F7F3EA',
  paper: '#FFFDF8',
  ink: '#17202A',
  muted: '#5D6673',
  faint: '#E7DED0',
  teal: '#0F766E',
  tealDark: '#0B4F4A',
  blue: '#2563EB',
  coral: '#D65A3A',
  amber: '#C47A22',
  green: '#2E7D32',
  red: '#B42318',
  slate: '#26313F',
  dark: '#111827',
  white: '#FFFFFF',
};

export function t(children, opts = {}) {
  const {
    size = 18,
    weight = 400,
    color = C.ink,
    italic = false,
    underline = false,
  } = opts;
  const parts = [
    'size: ' + size + 'px',
    'weight: ' + weight,
    'color: ' + color,
  ];
  if (italic) parts.push('italic: true');
  if (underline) parts.push('underline: true');
  return jsx('span', { textStyle: parts.join('; '), children });
}

export function textBlock(children, opts = {}) {
  const { width = 'fill', height, name } = opts;
  return jsx('div', { width, height, name, children });
}

export function para(children, opts = {}) {
  return textBlock(t(children, { size: 18, color: C.muted, ...opts }), { width: opts.width || 'fill' });
}

export function titleBlock(kicker, title, subtitle, dark = false) {
  const color = dark ? C.white : C.ink;
  const muted = dark ? '#D7E7E4' : C.muted;
  return jsxs('vstack', {
    width: 'fill',
    gap: 12,
    children: [
      kicker ? textBlock(t(kicker, { size: 13, weight: 700, color: dark ? '#9EE7DC' : C.teal })) : null,
      textBlock(t(title, { size: 38, weight: 700, color }), { width: 'fill' }),
      subtitle ? textBlock(t(subtitle, { size: 18, color: muted }), { width: 'fill' }) : null,
    ],
  });
}

export function slide(presentation, { kicker, title, subtitle, dark = false, children, footer = 'QRTable Thesis Deck' }) {
  const s = presentation.slides.add();
  s.compose(jsxs('section', {
    width: W,
    height: H,
    padding: dark ? 54 : 44,
    gap: dark ? 28 : 24,
    fill: dark ? C.dark : C.bg,
    children: [
      titleBlock(kicker, title, subtitle, dark),
      jsx('div', { width: 'fill', height: 'fill', children }),
      jsxs('hstack', {
        width: 'fill',
        height: 20,
        justify: 'between',
        children: [
          textBlock(t(footer, { size: 10, color: dark ? '#9CA3AF' : '#7A6F63' })),
          textBlock(t('Architecture / Phase 2A implemented', { size: 10, color: dark ? '#9CA3AF' : '#7A6F63' })),
        ],
      }),
    ],
  }));
  return s;
}

export function surface(children, opts = {}) {
  return jsx('surface', {
    width: opts.width ?? 'fill',
    height: opts.height,
    padding: opts.padding ?? 18,
    fill: opts.fill ?? C.paper,
    line: typeof opts.line === 'object' ? opts.line : undefined,
    borderRadius: opts.radius ?? 8,
    contentLayout: opts.contentLayout ?? 'column',
    gap: opts.gap ?? 10,
    children,
  });
}

export function chip(label, color = C.teal, fill = '#E6F4F1') {
  return surface(t(label, { size: 12, weight: 700, color }), {
    width: 'fill',
    height: 34,
    fill,
    line: fill,
    padding: 8,
    radius: 6,
  });
}

export function bulletList(items, opts = {}) {
  return jsx('ul', {
    width: opts.width ?? 'fill',
    style: {
      fontSize: opts.size ?? 16,
      color: opts.color ?? C.ink,
      lineSpacing: opts.leading ?? 1.2,
    },
    children: items.map((item) => jsx('li', { children: item })),
  });
}

export function numbered(items, opts = {}) {
  return jsx('ol', {
    width: opts.width ?? 'fill',
    style: {
      fontSize: opts.size ?? 16,
      color: opts.color ?? C.ink,
      lineSpacing: opts.leading ?? 1.18,
    },
    children: items.map((item) => jsx('li', { children: item })),
  });
}

export function stat(value, label, note, accent = C.teal) {
  return surface(jsxs('vstack', {
    gap: 6,
    children: [
      textBlock(t(value, { size: 34, weight: 700, color: accent })),
      textBlock(t(label, { size: 14, weight: 700, color: C.ink })),
      textBlock(t(note, { size: 12, color: C.muted })),
    ],
  }), { fill: C.paper, height: 142, padding: 18 });
}

export function node(title, detail, opts = {}) {
  return surface(jsxs('vstack', {
    gap: 6,
    children: [
      textBlock(t(title, { size: opts.titleSize ?? 16, weight: 700, color: opts.color ?? C.ink })),
      detail ? textBlock(t(detail, { size: opts.detailSize ?? 12, color: opts.detailColor ?? C.muted })) : null,
    ],
  }), {
    width: opts.width ?? 'fill',
    height: opts.height ?? 88,
    fill: opts.fill ?? C.paper,
    line: opts.line ?? '#D8CDBB',
    padding: opts.padding ?? 14,
    radius: 8,
  });
}

export function arrow(label = '→') {
  return textBlock(t(label, { size: 28, weight: 700, color: C.amber }), { width: 38, height: 60 });
}

export function flow(items, opts = {}) {
  const children = [];
  items.forEach((item, idx) => {
    children.push(node(item[0], item[1], { width: opts.nodeWidth ?? 150, height: opts.nodeHeight ?? 94, fill: item[2] ?? C.paper }));
    if (idx < items.length - 1) children.push(arrow());
  });
  return jsx('hstack', { width: 'fill', gap: opts.gap ?? 8, align: 'center', children });
}

export function matrix(rows, opts = {}) {
  const headerFill = opts.headerFill ?? C.slate;
  const widths = opts.widths ?? ['1.2fr', '1.4fr', '1.4fr', '1.4fr'];
  const resolvedWidths = widths.map((w) => (typeof w === 'number' ? w : 'fill'));
  return jsxs('vstack', {
    width: 'fill',
    gap: 0,
    children: rows.map((row, idx) => jsx('hstack', {
      width: 'fill',
      height: idx === 0 ? 42 : opts.rowHeight ?? 52,
      gap: 0,
      children: row.map((cell, cidx) => surface(
        textBlock(t(cell, {
          size: idx === 0 ? 12 : opts.size ?? 11,
          weight: idx === 0 ? 700 : 400,
          color: idx === 0 ? C.white : C.ink,
        })),
        {
          width: resolvedWidths[cidx] ?? 'fill',
          height: 'fill',
          padding: idx === 0 ? 10 : 9,
          radius: 0,
          fill: idx === 0 ? headerFill : idx % 2 ? C.paper : '#FBF7EF',
          line: '#E2D8C8',
        }
      )),
    })),
  });
}

export function sectionLabel(label) {
  return textBlock(t(label, { size: 12, weight: 700, color: C.teal }));
}
`;

const slides = [
  {
    title: 'Nghiên cứu và xây dựng QRTable',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, t, textBlock, stat, C } from './deck-utils.mjs';

export async function slide01(presentation) {
  return slide(presentation, {
    dark: true,
    kicker: 'Khóa luận tốt nghiệp · Báo cáo kiến trúc hệ thống',
    title: 'QRTable: SaaS POS tích hợp đặt món qua mã QR',
    subtitle: 'Microservices · Multi-tenant · RBAC · Redis session/cart · Kafka domain events',
    footer: 'Đề tài: SaaS POS with QR Code Ordering',
    children: jsxs('vstack', { width: 'fill', gap: 26, children: [
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        stat('2', 'Ứng dụng frontend', 'Customer PWA và Management App', '#9EE7DC'),
        stat('5+', 'Backend services', 'BFF, Authorizer, User-Access, Catalog, Order, SaaS', '#F6C177'),
        stat('Phase 2A', 'Đã triển khai sâu', 'Ordering, permissions, Redis cart/session, Kafka outbox', '#FCA5A5'),
      ]}),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Thông điệp chính', { size: 15, weight: 700, color: '#9EE7DC' })),
        textBlock(t('Deck này trình bày QRTable như một hệ thống luận văn hoàn chỉnh đang phát triển: đi từ bối cảnh bài toán, kiến trúc tổng quan, các flow nghiệp vụ, RBAC/auth, đến chiến lược kiểm thử và roadmap.', { size: 21, color: C.white })),
      ]}), { fill: '#1F2937', line: '#374151', padding: 24, height: 140 }),
    ]}),
  });
}
`,
  },
  {
    title: 'Bài toán F&B cần nhiều hơn một app đặt món đơn giản',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, t, textBlock, bulletList, C } from './deck-utils.mjs';

export async function slide02(presentation) {
  return slide(presentation, {
    kicker: '01 · Bối cảnh',
    title: 'Nhà hàng cần số hóa cả quy trình, không chỉ thay menu giấy bằng QR',
    subtitle: 'Điểm nghẽn nằm ở order handoff, phân quyền, dữ liệu bàn và trạng thái thời gian thực.',
    children: jsxs('hstack', { width: 'fill', gap: 22, children: [
      surface(jsxs('vstack', { gap: 14, children: [
        textBlock(t('Vấn đề vận hành', { size: 21, weight: 700, color: C.coral })),
        bulletList([
          'Khách chờ nhân viên đưa menu và ghi món.',
          'Order thủ công dễ sai, thiếu note hoặc chuyển bếp chậm.',
          'Nhân viên khó theo dõi bàn, order, bill theo trạng thái thật.',
          'Nhiều nhà hàng/chi nhánh cần cô lập dữ liệu và role rõ ràng.',
        ], { size: 16 }),
      ]}), { width: 'fill', height: 330 }),
      surface(jsxs('vstack', { gap: 14, children: [
        textBlock(t('Mục tiêu của QRTable', { size: 21, weight: 700, color: C.teal })),
        bulletList([
          'Customer PWA cho khách quét QR, xem menu, thêm cart, gửi order.',
          'Management App cho owner/manager/waiter vận hành POS, menu, bàn.',
          'Backend microservices có guard, tenant isolation, cache và event.',
          'Kiến trúc đủ mở rộng sang KDS, payment, observability.',
        ], { size: 16 }),
      ]}), { width: 'fill', height: 330 }),
    ]}),
  });
}
`,
  },
  {
    title: 'Các yêu cầu thiết kế kéo hệ thống về microservices',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, stat, t, textBlock, C } from './deck-utils.mjs';

export async function slide03(presentation) {
  return slide(presentation, {
    kicker: '02 · Design drivers',
    title: 'Bốn yêu cầu chi phối kiến trúc: tenant, permission, realtime, consistency',
    subtitle: 'Những yêu cầu này quyết định cách chia service, lưu dữ liệu, chọn Redis/Kafka và guard chain.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 16, children: [
        stat('Tenant', 'Cô lập dữ liệu', 'Mọi query và Redis key phải scope theo tenant_id', C.teal),
        stat('RBAC', 'Quyền theo vai trò', 'Frontend chỉ UX; BFF PermissionGuard là source of truth', C.blue),
        stat('Realtime', 'UI vận hành sống', 'BFF Direct/WebSocket cho hints, REST vẫn là source of truth', C.amber),
        stat('Consistency', 'Tránh race condition', 'Cart version, idempotency, stock deduct transactional', C.coral),
      ]}),
      surface(jsxs('hstack', { width: 'fill', gap: 18, children: [
        textBlock(t('Quyết định thiết kế', { size: 20, weight: 700, color: C.ink }), { width: 240 }),
        textBlock(t('BFF làm API Gateway duy nhất; Catalog sở hữu menu/table/stock; Order sở hữu session/cart/order/bill; Redis giữ runtime state; Kafka chỉ nhận domain event cần xử lý nghiệp vụ bất đồng bộ như order.confirmed.', { size: 19, color: C.muted }), { width: 'fill' }),
      ]}), { height: 126, padding: 22, fill: '#FFF8EC' }),
    ]}),
  });
}
`,
  },
  {
    title: 'Kiến trúc tổng quan',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, arrow, t, textBlock, C } from './deck-utils.mjs';

export async function slide04(presentation) {
  return slide(presentation, {
    kicker: '03 · System architecture',
    title: 'BFF đứng giữa frontend và các bounded-context services',
    subtitle: 'Frontend không gọi thẳng service nội bộ; mọi request đi qua guard, tenant context và response wrapper tại BFF.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      jsxs('hstack', { width: 'fill', gap: 14, align: 'center', children: [
        surface(jsxs('vstack', { gap: 12, children: [
          node('Customer PWA', 'QR ordering, menu, cart, tracking', { fill: '#E6F4F1', height: 82 }),
          node('Management App', 'POS, menu/table admin, service inbox', { fill: '#EEF2FF', height: 82 }),
        ]}), { width: 230, height: 214, fill: '#FFFCF6' }),
        arrow(),
        node('BFF API Gateway', 'REST entrypoint, guard chain, TCP/gRPC clients, WebSocket hints', { width: 250, height: 120, fill: '#0F766E', color: C.white, detailColor: '#D7E7E4' }),
        arrow(),
        surface(jsxs('vstack', { gap: 10, children: [
          jsxs('hstack', { gap: 10, children: [
            node('Authorizer', 'JWT verify / permissions', { fill: '#FFF1E8', height: 74 }),
            node('User-Access', 'users / roles / MongoDB', { fill: '#FFF1E8', height: 74 }),
          ]}),
          jsxs('hstack', { gap: 10, children: [
            node('Catalog', 'menu / table / QR / stock', { fill: '#EAF7EA', height: 74 }),
            node('Order', 'session / cart / order / bill', { fill: '#E9F2FF', height: 74 }),
          ]}),
          node('SaaS', 'tenant lifecycle / onboarding roadmap', { fill: '#F7ECDD', height: 66 }),
        ]}), { width: 'fill', height: 254, fill: '#FFFDF8' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 12, children: [
        node('Keycloak', 'OAuth2/OIDC identity provider', { fill: '#F3F4F6', height: 74 }),
        node('PostgreSQL', 'tenant/catalog/order operational data', { fill: '#F3F4F6', height: 74 }),
        node('MongoDB', 'users, roles, permissions', { fill: '#F3F4F6', height: 74 }),
        node('Redis', 'auth cache, menu cache, session, cart', { fill: '#F3F4F6', height: 74 }),
        node('Kafka', 'domain event: order.confirmed', { fill: '#F3F4F6', height: 74 }),
      ]}),
      textBlock(t('Triển khai hiện tại dùng chung database dev qrtable nhưng đã giữ tenant_id discriminator và ownership boundary để chuẩn bị tách database-per-service sau này.', { size: 14, color: C.muted })),
    ]}),
  });
}
`,
  },
  {
    title: 'Frontend surfaces',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, bulletList, t, textBlock, C } from './deck-utils.mjs';

export async function slide05(presentation) {
  return slide(presentation, {
    kicker: '04 · Frontend apps',
    title: 'Hai ứng dụng frontend phục vụ hai loại actor khác nhau',
    subtitle: 'Customer đi bằng session từ QR; staff đi bằng JWT/role/permission.',
    children: jsxs('hstack', { width: 'fill', gap: 24, children: [
      surface(jsxs('vstack', { gap: 14, children: [
        node('Customer PWA', 'Khách tại bàn · không cần login', { fill: '#E6F4F1', height: 78 }),
        bulletList([
          'Resolve tenant slug và validate QR token.',
          'Join table session, lưu sessionId.',
          'Xem menu thật theo tenant.',
          'Cart Redis + cartVersion.',
          'Submit order, tracking, service request, bill request.',
        ], { size: 15 }),
      ]}), { width: 'fill', height: 380 }),
      surface(jsxs('vstack', { gap: 14, children: [
        node('Management App', 'Owner / Manager / Waiter / Kitchen / Bar', { fill: '#EEF2FF', height: 78 }),
        bulletList([
          'Login bằng Keycloak JWT.',
          'Sidebar/route theo role để cải thiện UX.',
          'POS live orders gọi API thật.',
          'Confirm/cancel order theo permission.',
          'Menu, bàn, QR, service inbox, transfer table.',
        ], { size: 15 }),
      ]}), { width: 'fill', height: 380 }),
    ]}),
  });
}
`,
  },
  {
    title: 'Backend services',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, matrix } from './deck-utils.mjs';

export async function slide06(presentation) {
  return slide(presentation, {
    kicker: '05 · Backend services',
    title: 'Service boundary được chia theo ownership, không chia theo màn hình UI',
    subtitle: 'Mỗi service chịu trách nhiệm một miền dữ liệu và contract giao tiếp rõ ràng.',
    children: matrix([
      ['Service', 'Trách nhiệm', 'Dữ liệu sở hữu', 'Giao tiếp chính'],
      ['BFF', 'API Gateway, guards, response wrapper, realtime hints', 'Không owner domain data', 'HTTP REST, TCP/gRPC clients, WebSocket'],
      ['Authorizer', 'JWT validation, role mapping, collect permissions', 'Auth cache', 'gRPC/TCP với BFF, Keycloak'],
      ['User-Access', 'User, role, permission profile', 'Mongo users/roles', 'TCP/gRPC'],
      ['Catalog', 'Menu, category, area, table, QR, stock', 'Catalog tables', 'TCP commands từ BFF/Order'],
      ['Order', 'Session, cart, order lifecycle, bill, service request, transfer', 'Order tables, Redis cart/session', 'TCP, PostgreSQL, Redis, Kafka outbox'],
      ['SaaS', 'Tenant lifecycle roadmap', 'Tenants/subscriptions', 'Future Phase 4B'],
    ], { rowHeight: 56, size: 10, widths: ['0.8fr', '1.8fr', '1.4fr', '1.5fr'] }),
  });
}
`,
  },
  {
    title: 'Communication model',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, matrix, surface, t, textBlock, C } from './deck-utils.mjs';

export async function slide07(presentation) {
  return slide(presentation, {
    kicker: '06 · Communication',
    title: 'Mỗi kênh giao tiếp có vai trò riêng, tránh dùng Kafka như UI proxy',
    subtitle: 'Kiến trúc chọn kênh theo semantics: request/response, auth, runtime state, domain event hay UI hint.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      matrix([
        ['Kênh', 'Dùng cho', 'Ví dụ trong QRTable', 'Lý do'],
        ['HTTP REST', 'Frontend gọi BFF', 'POST /customer/orders, GET /admin/orders', 'Đơn giản, thống nhất auth/response'],
        ['TCP', 'BFF gọi microservice nội bộ', 'Order confirm, Catalog validate QR/deduct stock', 'Request-response nội bộ nhanh, typed pattern'],
        ['gRPC', 'Auth/user verification', 'UserGuard gọi Authorizer', 'Schema rõ, phù hợp auth metadata'],
        ['Redis', 'Runtime/cache state', 'cart:{tenantId}:{sessionId}', 'Nhanh, TTL, shared cart/session'],
        ['Kafka', 'Domain event bất đồng bộ', 'order.confirmed', 'Consumer nghiệp vụ không chặn producer'],
        ['WebSocket', 'Realtime UI hints', 'order.created, cart.updated', 'Client refetch REST sau event'],
      ], { rowHeight: 48, size: 10, widths: ['0.75fr', '1.15fr', '1.5fr', '1.35fr'] }),
      surface(textBlock(t('Decision rule: event nào cần business logic ở bounded context khác thì dùng Kafka; event chỉ cập nhật UI và BFF đã có dữ liệu thì dùng BFF Direct/WebSocket.', { size: 18, weight: 700, color: C.teal })), { height: 64, fill: '#E6F4F1', line: '#C5E5DE' }),
    ]}),
  });
}
`,
  },
  {
    title: 'Data ownership',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, arrow, t, textBlock, C } from './deck-utils.mjs';

export async function slide08(presentation) {
  return slide(presentation, {
    kicker: '07 · Data ownership',
    title: 'Order không tự sửa Catalog DB; stock đi qua Catalog TCP contract',
    subtitle: 'Boundary này giảm coupling và chuẩn bị cho database-per-service trong tương lai.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 12, align: 'center', children: [
        node('Customer / Staff Action', 'submit, confirm, transfer, request bill', { width: 190, fill: '#FFF8EC' }),
        arrow(),
        node('BFF', 'guards + tenant context + TCP payload', { width: 170, fill: '#E6F4F1' }),
        arrow(),
        node('Order Service', 'session/cart/order/bill state', { width: 200, fill: '#E9F2FF' }),
        arrow('↔'),
        node('Catalog Service', 'menu/table/stock ownership', { width: 200, fill: '#EAF7EA' }),
        arrow(),
        node('PostgreSQL / Redis', 'durable + runtime state', { width: 190, fill: '#F3F4F6' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 16, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Order Service owns', { size: 18, weight: 700, color: C.blue })),
          textBlock(t('sessions, carts, orders, order_items, bills, service_requests, outbox_events', { size: 16, color: C.muted })),
        ]}), { height: 130 }),
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Catalog Service owns', { size: 18, weight: 700, color: C.green })),
          textBlock(t('categories, menu_items, preparation station, areas, tables, QR tokens, stock/table status commands', { size: 16, color: C.muted })),
        ]}), { height: 130 }),
      ]}),
      textBlock(t('Khi staff confirm order, Order lock order PENDING rồi gọi Catalog deduct stock trong transaction của Catalog. Nếu stock thiếu, order giữ PENDING và trả lỗi nghiệp vụ.', { size: 17, color: C.ink })),
    ]}),
  });
}
`,
  },
  {
    title: 'Multi-tenant model',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, flow, surface, t, textBlock, bulletList, C } from './deck-utils.mjs';

export async function slide09(presentation) {
  return slide(presentation, {
    kicker: '08 · Multi-tenancy',
    title: 'Slug là định danh public; UUID tenant_id là identity nội bộ',
    subtitle: 'Luồng QR dùng slug để vào đúng tenant, sau đó mọi request/service/query dùng tenant_id.',
    children: jsxs('vstack', { width: 'fill', gap: 20, children: [
      flow([
        ['QR URL', 'slug = pho-viet'],
        ['Resolve tenant', 'slug → UUID'],
        ['BFF context', 'x-tenant-id / JWT claim'],
        ['Service payload', 'tenantId bắt buộc'],
        ['DB / Redis', 'WHERE tenant_id / key namespace'],
      ], { nodeWidth: 174, nodeHeight: 92 }),
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Tenant dev canonical', { size: 18, weight: 700, color: C.teal })),
          textBlock(t('slug: pho-viet', { size: 20, weight: 700, color: C.ink })),
          textBlock(t('tenantId: 023772bb-391b-401c-936a-ed7034b69cec', { size: 13, color: C.muted })),
          textBlock(t('name: Nhà hàng Phở Việt', { size: 15, color: C.muted })),
        ]}), { height: 160, fill: '#E6F4F1' }),
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Isolation rules', { size: 18, weight: 700, color: C.coral })),
          bulletList([
            'Không dùng tenant_a tiếp.',
            'Mọi persistent query có tenant_id filter.',
            'Redis key có namespace theo owner/tenant/session.',
            'FE query key scope theo tenant và session.',
          ], { size: 14 }),
        ]}), { height: 160 }),
      ]}),
    ]}),
  });
}
`,
  },
  {
    title: 'Auth and RBAC',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, node, arrow, surface, bulletList, t, textBlock, C } from './deck-utils.mjs';

export async function slide10(presentation) {
  return slide(presentation, {
    kicker: '09 · Authentication / Authorization',
    title: 'Staff dùng JWT + PermissionGuard; customer dùng session scope',
    subtitle: 'Hai actor có auth model khác nhau nhưng đều đi qua tenant context.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 10, align: 'center', children: [
        node('JWT Request', 'Management App', { width: 150, fill: '#EEF2FF' }),
        arrow(),
        node('UserGuard', 'verify JWT via Authorizer', { width: 160 }),
        arrow(),
        node('TenantGuard', 'resolve/enforce tenant', { width: 160 }),
        arrow(),
        node('PermissionGuard', '@Permissions([...])', { width: 170 }),
        arrow(),
        node('TCP Service Call', 'tenant-scoped payload', { width: 170, fill: '#E6F4F1' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        surface(jsxs('vstack', { gap: 12, children: [
          textBlock(t('Staff/Admin endpoints', { size: 19, weight: 700, color: C.blue })),
          bulletList([
            'Keycloak access token trong Authorization header.',
            'Authorizer validate token, role mapping và permissions từ MongoDB.',
            'BFF PermissionGuard mới là source of truth.',
          ], { size: 15 }),
        ]}), { height: 180 }),
        surface(jsxs('vstack', { gap: 12, children: [
          textBlock(t('Customer endpoints', { size: 19, weight: 700, color: C.teal })),
          bulletList([
            'Không có DB role CUSTOMER.',
            'QR validation + Order session ID.',
            'x-session-id + ownership checks theo session/table.',
          ], { size: 15 }),
        ]}), { height: 180 }),
      ]}),
    ]}),
  });
}
`,
  },
  {
    title: 'Staff secured API flow',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, flow, matrix } from './deck-utils.mjs';

export async function slide11(presentation) {
  return slide(presentation, {
    kicker: '10 · Flow: secured staff API',
    title: 'Một API staff hợp lệ phải qua đủ authenticate, tenant và authorize',
    subtitle: 'Ví dụ: waiter confirm order pending.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      flow([
        ['Management App', 'JWT + x-tenant-id'],
        ['BFF UserGuard', 'Authorizer verifies token'],
        ['TenantGuard', 'tenant claim/header consistency'],
        ['PermissionGuard', 'requires order.confirm'],
        ['Order TCP', 'confirm command'],
        ['ResponseDto', 'wrapped response'],
      ], { nodeWidth: 150, nodeHeight: 90 }),
      matrix([
        ['Test case', 'Input', 'Expected'],
        ['Happy path', 'JWT hợp lệ, tenant đúng, permission order.confirm', '200 + order PROCESSING'],
        ['JWT expired', 'Access token hết hạn', '401'],
        ['Role mismatch', 'Keycloak roles không giao với DB roles', '401'],
        ['Tenant mismatch', 'User tenant A gọi x-tenant-id tenant B', '403'],
        ['Permission denied', 'Chef/Barista gọi raw confirm order endpoint', '403'],
      ], { rowHeight: 50, size: 11, widths: ['1fr', '1.8fr', '1.4fr'] }),
    ]}),
  });
}
`,
  },
  {
    title: 'QR session flow',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, flow, matrix } from './deck-utils.mjs';

export async function slide12(presentation) {
  return slide(presentation, {
    kicker: '11 · Flow: QR join session',
    title: 'Customer không login; QR xác thực tenant/table rồi Order tạo table session',
    subtitle: 'Order session là source of truth cho customer ordering, khác với BFF anonymous session.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      flow([
        ['QR URL', 'tenant slug + table token'],
        ['Resolve tenant', 'pho-viet → tenantId'],
        ['Validate QR', 'Catalog TCP'],
        ['Join session', 'BFF → Order TCP'],
        ['Persist/cache', 'PostgreSQL + Redis hash'],
        ['PWA headers', 'x-tenant-id + x-session-id'],
      ], { nodeWidth: 150, nodeHeight: 88 }),
      matrix([
        ['Case', 'Điều kiện', 'Kết quả mong đợi'],
        ['Happy path', 'Slug và QR token hợp lệ', 'Session active, PWA vào menu/order flow'],
        ['Invalid QR', 'Token sai hoặc bị regenerate', 'Reject, không join session'],
        ['Unknown tenant', 'Slug không tồn tại', 'Resolve fail'],
        ['Redis mất key', 'PostgreSQL session còn hợp lệ', 'Hydrate lại Redis session'],
        ['Wrong session owner', 'x-session-id không thuộc tenant/table', 'Security/session error'],
      ], { rowHeight: 48, size: 11, widths: ['1fr', '1.7fr', '1.6fr'] }),
    ]}),
  });
}
`,
  },
  {
    title: 'Menu cart order submit',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, flow, surface, bulletList, matrix, t, textBlock, C } from './deck-utils.mjs';

export async function slide13(presentation) {
  return slide(presentation, {
    kicker: '12 · Flow: menu → cart → submit',
    title: 'Cart là draft order trong Redis; order row chỉ sinh khi customer submit',
    subtitle: 'CartVersion là concurrency token từ server, client không tự tăng.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      flow([
        ['GET menu', 'tenant-scoped catalog/menu cache'],
        ['GET cart', 'Redis snapshot + cartVersion'],
        ['PATCH cart', 'expectedCartVersion'],
        ['POST order', 'idempotencyKey'],
        ['Order DB', 'PENDING + bill OPEN if first'],
        ['Tracking', 'REST detail + WS hints'],
      ], { nodeWidth: 150, nodeHeight: 86 }),
      jsxs('hstack', { width: 'fill', gap: 14, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Cart rules', { size: 18, weight: 700, color: C.teal })),
          bulletList([
            'Redis key: cart:{tenantId}:{sessionId}.',
            'Mutation phải gửi expectedCartVersion.',
            '409 CART_VERSION_CONFLICT → refetch cart + toast.',
            'Bill request sẽ lock ordering/cart.',
          ], { size: 13 }),
        ]}), { height: 180 }),
        matrix([
          ['Case', 'Expected'],
          ['Cart version khớp', 'Update thành công, server tăng version'],
          ['Version cũ', '409 conflict, PWA refetch'],
          ['Submit trùng idempotency key', 'Không tạo duplicate order'],
          ['Cross-session order detail', 'Reject ownership check'],
        ], { rowHeight: 36, size: 10, widths: ['1.2fr', '1.6fr'] }),
      ]}),
    ]}),
  });
}
`,
  },
  {
    title: 'Confirm order and Kafka',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, flow, surface, matrix, t, textBlock, C } from './deck-utils.mjs';

export async function slide14(presentation) {
  return slide(presentation, {
    kicker: '13 · Flow: staff confirm order',
    title: 'Confirm order là giao điểm của RBAC, stock consistency và Kafka event',
    subtitle: 'Order chuyển PENDING → PROCESSING chỉ sau khi Catalog deduct stock thành công.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      flow([
        ['POS confirm', 'POST /admin/orders/:id/confirm'],
        ['BFF guards', 'order.confirm permission'],
        ['Order lock', 'validate PENDING'],
        ['Catalog TCP', 'deduct stock in transaction'],
        ['Outbox row', 'order.confirmed payload'],
        ['Kafka publish', 'future KDS/consumers'],
      ], { nodeWidth: 150, nodeHeight: 88 }),
      jsxs('hstack', { width: 'fill', gap: 14, children: [
        surface(jsxs('vstack', { gap: 8, children: [
          textBlock(t('Why Kafka here?', { size: 18, weight: 700, color: C.coral })),
          textBlock(t('order.confirmed là domain event hiện kích hoạt Kitchen; Notification/Analytics là mở rộng tương lai. Producer không chờ consumer; event được ghi qua simplified outbox để giảm dual-write risk.', { size: 15, color: C.muted })),
        ]}), { height: 150, fill: '#FFF1E8' }),
        matrix([
          ['Failure case', 'Expected behavior'],
          ['Stock thiếu', 'Order giữ PENDING, trả item details'],
          ['Order đã PROCESSING', 'Reject invalid transition'],
          ['Kafka lỗi tạm thời', 'Outbox giữ trạng thái retry/pending'],
        ], { rowHeight: 38, size: 10, widths: ['1.2fr', '1.8fr'] }),
      ]}),
    ]}),
  });
}
`,
  },
  {
    title: 'Realtime strategy',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, arrow, t, textBlock, bulletList, C } from './deck-utils.mjs';

export async function slide15(presentation) {
  return slide(presentation, {
    kicker: '14 · Realtime strategy',
    title: 'Realtime UI dùng BFF Direct; domain event dùng Kafka',
    subtitle: 'WebSocket chỉ là hint để client refetch REST, không thay REST làm source of truth.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 14, align: 'center', children: [
        node('Order submitted', 'BFF nhận response từ Order TCP', { width: 190, fill: '#FFF8EC' }),
        arrow(),
        node('BFF Direct', 'order.created / cart.updated / service.requested', { width: 260, fill: '#E6F4F1' }),
        arrow(),
        node('Client refetch', 'POS/PWA invalidate React Query', { width: 210, fill: '#EEF2FF' }),
        arrow(),
        node('REST source', 'GET order/cart/list detail', { width: 190, fill: '#F3F4F6' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('BFF Direct events', { size: 18, weight: 700, color: C.teal })),
          bulletList(['order.created', 'order.status_changed', 'cart.updated', 'service.requested', 'bill.requested', 'table.transferred'], { size: 14 }),
        ]}), { height: 190 }),
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Kafka events', { size: 18, weight: 700, color: C.coral })),
          bulletList(['order.confirmed trong Phase 2A', 'payment.completed/refunded ở Phase 3', 'kitchen.sla_warning ở Phase 2B/4A', 'tenant.created ở SaaS onboarding'], { size: 14 }),
        ]}), { height: 190 }),
      ]}),
    ]}),
  });
}
`,
  },
  {
    title: 'Operational flows',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, flow, bulletList, t, textBlock, C } from './deck-utils.mjs';

export async function slide16(presentation) {
  return slide(presentation, {
    kicker: '15 · Operational flows',
    title: 'Service request, bill request và transfer table mở rộng luồng ordering',
    subtitle: 'Ba flow này chứng minh session/table/order/bill không thể tách rời ở POS runtime.',
    children: jsxs('vstack', { width: 'fill', gap: 14, children: [
      surface(jsxs('vstack', { gap: 8, children: [
        textBlock(t('Service request', { size: 18, weight: 700, color: C.teal })),
        flow([['Customer request', 'CALL_STAFF / GENERAL_HELP'], ['Order Service', 'create service request'], ['BFF Direct', 'service.requested'], ['Staff inbox', 'acknowledge / resolve']], { nodeWidth: 178, nodeHeight: 70 }),
      ]}), { height: 126 }),
      surface(jsxs('vstack', { gap: 8, children: [
        textBlock(t('Bill request', { size: 18, weight: 700, color: C.amber })),
        flow([['Customer bill', 'explicit command'], ['Order checks', 'bill/session readiness'], ['Bill status', 'OPEN → PENDING_PAYMENT'], ['Cart locked', 'payment Phase 3']], { nodeWidth: 178, nodeHeight: 70 }),
      ]}), { height: 126, fill: '#FFF8EC' }),
      surface(jsxs('vstack', { gap: 8, children: [
        textBlock(t('Transfer table', { size: 18, weight: 700, color: C.blue })),
        flow([['Staff transfer', 'fromTable → toTable'], ['Order saga', 'locks + validate'], ['Catalog TCP', 'table status update'], ['Redis/DB', 'session metadata updated']], { nodeWidth: 178, nodeHeight: 70 }),
      ]}), { height: 126, fill: '#EEF2FF' }),
    ]}),
  });
}
`,
  },
  {
    title: 'Consistency and error model',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, matrix, surface, t, textBlock, C } from './deck-utils.mjs';

export async function slide17(presentation) {
  return slide(presentation, {
    kicker: '16 · Consistency / error handling',
    title: 'Lỗi nghiệp vụ được đặt tên rõ để UI biết refetch, retry hay dừng',
    subtitle: 'Response wrapper thống nhất giúp frontend xử lý lỗi và logging theo processID/duration.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      surface(textBlock(t('{ data, message, statusCode, duration, processID }', { size: 24, weight: 700, color: C.teal })), { height: 72, fill: '#E6F4F1', line: '#C5E5DE' }),
      matrix([
        ['Error code', 'Khi nào xảy ra', 'UI / hệ thống nên làm gì'],
        ['CART_VERSION_CONFLICT', 'Client gửi expectedCartVersion cũ', 'Refetch cart, toast conflict, không tự tăng version'],
        ['ITEM_UNAVAILABLE', 'Món không còn order được', 'Disable/remove item'],
        ['PRICE_CHANGED', 'Giá thay đổi so với cart snapshot', 'Hiển thị giá mới, yêu cầu xác nhận lại'],
        ['INSUFFICIENT_STOCK', 'Confirm thất bại do stock thiếu', 'Giữ order PENDING, staff xử lý món thay thế/cancel'],
        ['BILL_NOT_READY', 'Gọi hóa đơn quá sớm', 'Thông báo order/item chưa đủ điều kiện'],
        ['TENANT_MISMATCH', 'Sai tenant/session xuyên miền', 'Security error, không auto retry'],
      ], { rowHeight: 48, size: 10, widths: ['1.1fr', '1.55fr', '1.8fr'] }),
    ]}),
  });
}
`,
  },
  {
    title: 'Test strategy',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, bulletList, t, textBlock, C } from './deck-utils.mjs';

export async function slide18(presentation) {
  return slide(presentation, {
    kicker: '17 · Verification strategy',
    title: 'Kiểm thử được tổ chức theo tầng và theo flow nghiệp vụ',
    subtitle: 'Mục tiêu không chỉ là pass unit test, mà là chứng minh flow UI → BFF → service → DB/Redis/Kafka đúng.',
    children: jsxs('hstack', { width: 'fill', gap: 16, children: [
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Unit tests', { size: 19, weight: 700, color: C.blue })),
        bulletList(['Cart version conflict', 'Order lifecycle', 'Bill totals', 'Session policy', 'Transfer service', 'Permission guard'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Integration tests', { size: 19, weight: 700, color: C.teal })),
        bulletList(['BFF controller → TCP payload', 'Order → Catalog deduct stock', 'Redis session/cart', 'Outbox event creation', 'Tenant filtering'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Frontend tests', { size: 19, weight: 700, color: C.amber })),
        bulletList(['React Query keys tenant/session scoped', 'Cart mutation rollback/refetch', 'POS polling and invalidation', 'QR URL/tenant slug', 'Toast/error states'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Manual E2E demo', { size: 19, weight: 700, color: C.coral })),
        bulletList(['QR join', 'Menu + cart', 'Submit order', 'Staff confirm', 'Tracking update', 'Service request/transfer'], { size: 14 }),
      ]}), { height: 320 }),
    ]}),
  });
}
`,
  },
  {
    title: 'Flow test matrix',
    code: `
import { slide, matrix } from './deck-utils.mjs';

export async function slide19(presentation) {
  return slide(presentation, {
    kicker: '18 · Test matrix',
    title: 'Các test case trọng yếu theo từng flow',
    subtitle: 'Mỗi flow cần happy path, authorization failure, tenant/session mismatch và consistency edge case.',
    children: matrix([
      ['Flow', 'Happy case', 'Failure / edge case', 'Expected'],
      ['Login / RBAC', 'JWT hợp lệ, role khớp Mongo', 'JWT expired / missing permission', '200 hoặc 401/403 rõ ràng'],
      ['QR join', 'Slug + token hợp lệ', 'Token sai, token cũ sau regenerate', 'Không join session'],
      ['Menu', 'Menu đúng tenant', 'Cache cũ hoặc tenant khác', 'Không lộ cross-tenant data'],
      ['Cart', 'Version khớp', 'Version cũ, bill locked', '409 conflict hoặc reject mutate'],
      ['Submit order', 'Cart có item', 'Duplicate idempotency key', 'Không tạo duplicate'],
      ['Confirm order', 'Stock đủ', 'Stock thiếu / invalid state', 'PROCESSING hoặc giữ PENDING'],
      ['Service/Bill/Transfer', 'Session/table hợp lệ', 'Session invalid, bàn đích occupied', 'Reject không orphan data'],
    ], { rowHeight: 45, size: 9.5, widths: ['0.85fr', '1.35fr', '1.55fr', '1.35fr'] }),
  });
}
`,
  },
  {
    title: 'Implementation status',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, bulletList, t, textBlock, C } from './deck-utils.mjs';

export async function slide20(presentation) {
  return slide(presentation, {
    kicker: '19 · Hiện trạng triển khai',
    title: 'Phase 2A đã hiện thực hóa sâu luồng ordering end-to-end',
    subtitle: 'Nên trình bày là “đã hoàn tất phạm vi Phase 2A”, không overclaim production-ready.',
    children: jsxs('hstack', { width: 'fill', gap: 18, children: [
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Đã có trong code', { size: 20, weight: 700, color: C.teal })),
        bulletList([
          'Order Service: session, cart, order, bill, service request, transfer, outbox.',
          'BFF: customer/admin order REST + WebSocket gateway.',
          'Customer PWA: real tenant/session/cart/order/service/bill APIs.',
          'Management App: real POS orders, service inbox, transfer, QR dynamic tenant.',
          'Canonical reseed tenant pho-viet.',
        ], { size: 14 }),
      ]}), { height: 360 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Chưa overclaim', { size: 20, weight: 700, color: C.coral })),
        bulletList([
          'Cash/SePay VietQR payment confirmation thuộc Phase 3.',
          'KDS full realtime và Redis Adapter thuộc Phase 2B.',
          'Full saga/outbox hardening thuộc Phase 4A.',
          'SaaS onboarding self-service thuộc Phase 4B.',
          'Observability/Grafana tracing là phase sau.',
        ], { size: 14 }),
      ]}), { height: 360, fill: '#FFF1E8' }),
    ]}),
  });
}
`,
  },
  {
    title: 'Demo script',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, numbered, surface, t, textBlock, C } from './deck-utils.mjs';

export async function slide21(presentation) {
  return slide(presentation, {
    kicker: '20 · Demo narrative',
    title: 'Demo nên chứng minh kiến trúc, không chỉ bấm qua UI',
    subtitle: 'Mỗi bước demo nên nói rõ request đi qua thành phần nào và state đổi ở đâu.',
    children: jsxs('hstack', { width: 'fill', gap: 18, children: [
      surface(numbered([
        'Reseed dev với tenant pho-viet.',
        'Mở Management App xem bàn và QR.',
        'Mở Customer PWA từ QR URL.',
        'Resolve tenant, validate QR, join session.',
        'Xem menu thật, thêm món vào cart Redis.',
        'Submit order tạo PENDING order.',
        'POS thấy order pending.',
        'Waiter confirm order, Catalog deduct stock.',
        'Customer tracking cập nhật status.',
        'Gửi service request hoặc transfer table.',
      ], { size: 14 }), { height: 390 }),
      surface(jsxs('vstack', { gap: 14, children: [
        textBlock(t('Câu nói xuyên suốt demo', { size: 20, weight: 700, color: C.teal })),
        textBlock(t('Một thao tác UI đi qua BFF guard/controller, chuyển thành TCP command đến service sở hữu domain, ghi PostgreSQL/Redis, rồi trả response hoặc phát realtime/Kafka event đúng vai trò.', { size: 21, color: C.ink })),
      ]}), { height: 390, fill: '#E6F4F1', padding: 26 }),
    ]}),
  });
}
`,
  },
  {
    title: 'Roadmap and conclusion',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, arrow, t, textBlock, C } from './deck-utils.mjs';

export async function slide22(presentation) {
  return slide(presentation, {
    kicker: '21 · Roadmap / Conclusion',
    title: 'Kiến trúc lõi đã chứng minh được flow đặt món; các phase sau mở rộng chiều sâu vận hành',
    subtitle: 'Deck này có thể tiếp tục lớn dần thành slide bảo vệ chính thức khi các phase tiếp theo hoàn thành.',
    children: jsxs('vstack', { width: 'fill', gap: 20, children: [
      jsxs('hstack', { width: 'fill', gap: 10, align: 'center', children: [
        node('Phase 2A', 'Permissions + Order + Kafka implemented', { width: 180, fill: '#E6F4F1' }),
        arrow(),
        node('Phase 2B', 'KDS realtime hardening', { width: 170, fill: '#EEF2FF' }),
        arrow(),
        node('Phase 3', 'Payment + bill finalization', { width: 170, fill: '#FFF8EC' }),
        arrow(),
        node('Phase 4', 'Saga / SaaS onboarding / hardening', { width: 190, fill: '#FFF1E8' }),
        arrow(),
        node('Phase 5-7', 'Observability, tests, final demo', { width: 180, fill: '#F3F4F6' }),
      ]}),
      surface(jsxs('vstack', { gap: 16, children: [
        textBlock(t('Kết luận', { size: 20, weight: 700, color: C.teal })),
        textBlock(t('QRTable không chỉ là một app đặt món bằng QR. Đây là nền tảng SaaS POS đa tenant, có BFF kiểm soát auth/RBAC, service boundary theo ownership, Redis cho runtime state, Kafka cho domain event và flow ordering end-to-end đã được hiện thực hóa đến Phase 2A.', { size: 22, color: C.ink })),
      ]}), { height: 190, fill: C.paper, padding: 28 }),
    ]}),
  });
}
`,
  },
];

await fs.rm(slidesDir, { recursive: true, force: true });
await fs.mkdir(slidesDir, { recursive: true });
await fs.writeFile(path.join(slidesDir, 'deck-utils.mjs'), utils, 'utf8');

for (let i = 0; i < slides.length; i += 1) {
  const file = `slide-${String(i + 1).padStart(2, '0')}.mjs`;
  await fs.writeFile(path.join(slidesDir, file), slides[i].code.trimStart(), 'utf8');
}

const profilePlan = `task mode: create
primary deck-profile: engineering-platform
secondary gates: product-platform narrative, appendix-light test matrix
required proof objects: architecture map, communication model, RBAC flow, QR/session flow, cart/order flow, confirm/Kafka flow, test matrix, roadmap
source requirements: local docs/business-logic.md, docs/technical-architecture.md, docs/implementation_plan.md, docs/phases/phase-2a-order-kafka.md, docs/phases/phase-2b-kitchen-websocket.md, docs/specs/business-logic-step-2.4-spec.vi.md, docs/architecture/permission-matrix.md, docs/references/auth-system-reference.md, recent git log
known missing inputs: official university template and presenter/student metadata are not provided
`;
await fs.writeFile(path.join(workspace, 'profile-plan.txt'), profilePlan, 'utf8');

const sourceNotes = `Sources used:
- docs/business-logic.md
- docs/technical-architecture.md
- docs/implementation_plan.md
- docs/phases/phase-2a-order-kafka.md
- docs/specs/business-logic-step-2.4-spec.vi.md
- docs/architecture/permission-matrix.md
- docs/references/auth-system-reference.md
- docs/phases/phase-2a-order-kafka.md
- docs/phases/phase-2b-kitchen-websocket.md
- git log --oneline --decorate -12

No external brand assets used. QRTable wordmark is represented as plain editable text only.
`;
await fs.writeFile(path.join(workspace, 'source-notes.txt'), sourceNotes, 'utf8');

console.log(JSON.stringify({ workspace, slidesDir, slideCount: slides.length }, null, 2));
