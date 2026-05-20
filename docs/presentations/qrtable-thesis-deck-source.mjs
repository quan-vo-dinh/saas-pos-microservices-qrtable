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
title: 'Research and build QRTable',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, t, textBlock, stat, C } from './deck-utils.mjs';

export async function slide01(presentation) {
  return slide(presentation, {
    dark: true,
kicker: 'Graduation thesis · System architecture report',
title: 'QRTable: SaaS POS integrates ordering via QR code',
    subtitle: 'Microservices · Multi-tenant · RBAC · Redis session/cart · Kafka domain events',
footer: 'Topic: SaaS POS with QR Code Ordering',
    children: jsxs('vstack', { width: 'fill', gap: 26, children: [
      jsxs('hstack', { width: 'fill', gap: 18, children: [
stat('2', 'Frontend applications', 'Customer PWA and Management App', '#9EE7DC'),
        stat('5+', 'Backend services', 'BFF, Authorizer, User-Access, Catalog, Order, SaaS', '#F6C177'),
stat('Phase 2A', 'Deeply implemented', 'Ordering, permissions, Redis cart/session, Kafka outbox', '#FCA5A5'),
      ]}),
      surface(jsxs('vstack', { gap: 12, children: [
textBlock(t('Main message', { size: 15, weight: 700, color: '#9EE7DC' })),
textBlock(t('This deck presents QRTable as a complete thesis system in development: going from problem context, overall architecture, business flows, RBAC/auth, to testing strategy and roadmap.', { size: 21, color: C.white })),
      ]}), { fill: '#1F2937', line: '#374151', padding: 24, height: 140 }),
    ]}),
  });
}
`,
  },
  {
title: 'The F&B problem needs more than a simple ordering app',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, t, textBlock, bulletList, C } from './deck-utils.mjs';

export async function slide02(presentation) {
  return slide(presentation, {
kicker: '01 · Background',
title: 'Restaurants need to digitize the whole process, not just replace paper menus with QR',
subtitle: 'The bottleneck lies in order handoff, decentralization, table data and real-time status.',
    children: jsxs('hstack', { width: 'fill', gap: 22, children: [
      surface(jsxs('vstack', { gap: 14, children: [
textBlock(t('Operation problem', { size: 21, weight: 700, color: C.coral })),
        bulletList([
'Customers wait for staff to give menus and take orders.',
'Manual orders are prone to errors, lack of notes or slow delivery to the kitchen.',
'It's difficult for staff to keep track of tables, orders, and bills according to their real status.',
'Many restaurants/branches need data isolation and clear roles.',
        ], { size: 16 }),
      ]}), { width: 'fill', height: 330 }),
      surface(jsxs('vstack', { gap: 14, children: [
        textBlock(t('Goal of QRTable', { size: 21, weight: 700, color: C.teal })),
        bulletList([
'Customer PWA for customers to scan QR, view menu, add cart, send order.',
'Management App for Owner/manager/waiter to operate POS, menu, desk.',
'Backend microservices has guards, tenant isolation, cache and event.',
'Architecture is sufficiently scalable to KDS, payment, observability.',
        ], { size: 16 }),
      ]}), { width: 'fill', height: 330 }),
    ]}),
  });
}
`,
  },
  {
title: 'Design requirements pull systems towards microservices',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, stat, t, textBlock, C } from './deck-utils.mjs';

export async function slide03(presentation) {
  return slide(presentation, {
    kicker: '02 · Design drivers',
    title: 'Four requirements that govern architecture: tenant, permission, realtime, consistency',
    subtitle: 'These requirements determine how to divide services, store data, choose Redis/Kafka and guard chain.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 16, children: [
        stat('tenant', 'Data isolation', 'All queries and Redis keys must scope to tenant_id', C.teal),
        stat('RBAC', 'Role permissions', 'Frontend only UX; BFF PermissionGuard is source of truth', C.blue),
        stat('Realtime', 'Live UI', 'BFF Direct/WebSocket for hints, REST is still source of truth', C.amber),
        stat('Consistency', 'Avoid race condition', 'Cart version, idempotency, stock deduct transactional', C.coral),
      ]}),
      surface(jsxs('hstack', { width: 'fill', gap: 18, children: [
        textBlock(t('Design decision', { size: 20, weight: 700, color: C.ink }), { width: 240 }),
        textBlock(t('BFF is the only API Gateway; Catalog owns menu/table/stock; Order owns session/cart/order/bill; Redis holds runtime state; Kafka only receives domain event needs to process asynchronous operations like order.confirmed.', { size: 19, color: C.muted }), { width: 'fill' }),
      ]}), { height: 126, padding: 22, fill: '#FFF8EC' }),
    ]}),
  });
}
`,
  },
  {
    title: 'Architecture overview',
    code: `
import { jsx, jsxs } from '@oai/artifact-tool/presentation-jsx/jsx-runtime';
import { slide, surface, node, arrow, t, textBlock, C } from './deck-utils.mjs';

export async function slide04(presentation) {
  return slide(presentation, {
    kicker: '03 · System architecture',
title: 'BFF stands between frontend and bounded-context services',
subtitle: 'Frontend does not call internal service directly; every request goes through the guard, tenant context and response wrapper at BFF.',
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
textBlock(t('Implementation current uses the shared dev database `qrtable`, while already keeping tenant_id discriminators and ownership boundaries for future database-per-service separation.', { size: 14, color: C.muted })),
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
title: 'Two frontend applications serving two different types of actors',
subtitle: 'Customer goes by session from QR; staff goes with JWT/role/permission.',
    children: jsxs('hstack', { width: 'fill', gap: 24, children: [
      surface(jsxs('vstack', { gap: 14, children: [
node('Customer PWA', 'Guest at desk · not needs login', { fill: '#E6F4F1', height: 78 }),
        bulletList([
          'Resolve tenant slug and validate QR token.',
'Join table session, stores sessionId.',
'See real menu by tenant.',
          'Cart Redis + cartVersion.',
          'Submit order, tracking, service request, bill request.',
        ], { size: 15 }),
      ]}), { width: 'fill', height: 380 }),
      surface(jsxs('vstack', { gap: 14, children: [
        node('Management App', 'Owner / Manager / Waiter / Kitchen / Bar', { fill: '#EEF2FF', height: 78 }),
        bulletList([
'Login using Keycloak JWT.',
'Sidebar/route by role to improve UX.',
'POS live orders call real API.',
          'Confirm/cancel order theo permission.',
'Menu, tables, QR, service inbox, transfer table.',
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
title: 'service boundary is divided by ownership, not by UI screen',
subtitle: 'Each service is responsible for a clear data domain and communication contract.',
    children: matrix([
['service', 'Responsibility', 'Owned data', 'Main communication'],
['BFF', 'API Gateway, guards, response wrapper, realtime hints', 'Does not own domain data', 'HTTP REST, TCP/gRPC clients, WebSocket'],
      ['Authorizer', 'JWT validation, role mapping, collect permissions', 'Auth cache', 'gRPC/TCP with BFF, Keycloak'],
      ['User-Access', 'User, role, permission profile', 'Mongo users/roles', 'TCP/gRPC'],
      ['Catalog', 'Menu, category, area, table, QR, stock', 'Catalog tables', 'TCP commands from BFF/Order'],
      ['Order', 'Session, cart, order lifecycle, bill, service request, transfer', 'Order tables, Redis cart/session', 'TCP, PostgreSQL, Redis, Kafka outbox'],
      ['SaaS', 'tenant lifecycle roadmap', 'Tenants/subscriptions', 'Future Phase 4B'],
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
    title: 'Each communication channel has its own role, avoid using Kafka as a UI proxy',
    subtitle: 'Architecture selects channels according to semantics: request/response, auth, runtime state, domain event or UI hint.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      matrix([
        ['Channel', 'Used for', 'Example in QRTable', 'Reason'],
        ['HTTP REST', 'Frontend call BFF', 'POST /customer/orders, GET /admin/orders', 'Simple, unified auth/response'],
        ['TCP', 'BFF calls internal microservice', 'Order confirm, Catalog validate QR/deduct stock', 'Fast internal request-response, typed pattern'],
        ['gRPC', 'Auth/user verification', 'UserGuard calls Authorizer', 'Clear Schema, appropriate auth metadata'],
        ['Redis', 'Runtime/cache state', 'cart:{tenantId}:{sessionId}', 'Fast, TTL, shared cart/session'],
        ['Kafka', 'Domain event asynchronous', 'order.confirmed', 'Consumer business not blocking producer'],
        ['WebSocket', 'Realtime UI hints', 'order.created, cart.updated', 'Client refetch REST after event'],
      ], { rowHeight: 48, size: 10, widths: ['0.75fr', '1.15fr', '1.5fr', '1.35fr'] }),
      surface(textBlock(t('Decision rule: events that need business logic in another bounded context use Kafka; events that only update the UI and BFF already has data use BFF Direct/WebSocket.', { size: 18, weight: 700, color: C.teal })), { height: 64, fill: '#E6F4F1', line: '#C5E5DE' }),
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
    title: 'Order not auto-correct Catalog DB; stock goes through Catalog TCP contract',
    subtitle: 'This boundary reduces coupling and prepares for database-per-service in the future.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 12, align: 'center', children: [
        node('Customer / Staff Action', 'submit, confirm, transfer, request bill', { width: 190, fill: '#FFF8EC' }),
        arrow(),
        node('BFF', 'guards + tenant context + TCP payload', { width: 170, fill: '#E6F4F1' }),
        arrow(),
        node('Order service', 'session/cart/order/bill state', { width: 200, fill: '#E9F2FF' }),
        arrow('↔'),
        node('Catalog service', 'menu/table/stock ownership', { width: 200, fill: '#EAF7EA' }),
        arrow(),
        node('PostgreSQL / Redis', 'durable + runtime state', { width: 190, fill: '#F3F4F6' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 16, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Order service owners', { size: 18, weight: 700, color: C.blue })),
          textBlock(t('sessions, carts, orders, order_items, bills, service_requests, outbox_events', { size: 16, color: C.muted })),
        ]}), { height: 130 }),
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Catalog service owners', { size: 18, weight: 700, color: C.green })),
          textBlock(t('categories, menu_items, preparation station, areas, tables, QR tokens, stock/table status commands', { size: 16, color: C.muted })),
        ]}), { height: 130 }),
      ]}),
      textBlock(t('When staff confirm order, Order locks order PENDING and then calls Catalog deduct stock in transaction of Catalog. If stock is missing, order keeps PENDING and returns operational error.', { size: 17, color: C.ink })),
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
title: 'Slug is public identifier; UUID tenant_id is internal identity',
subtitle: 'QR flow uses slug to get into the correct tenant, then every request/service/query uses tenant_id.',
    children: jsxs('vstack', { width: 'fill', gap: 20, children: [
      flow([
        ['QR URL', 'slug = pho-viet'],
        ['Resolve tenant', 'slug → UUID'],
        ['BFF context', 'x-tenant-id / JWT claim'],
['service payload', 'required tenantId'],
        ['DB / Redis', 'WHERE tenant_id / key namespace'],
      ], { nodeWidth: 174, nodeHeight: 92 }),
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('tenant dev canonical', { size: 18, weight: 700, color: C.teal })),
          textBlock(t('slug: pho-viet', { size: 20, weight: 700, color: C.ink })),
          textBlock(t('tenantId: 023772bb-391b-401c-936a-ed7034b69cec', { size: 13, color: C.muted })),
textBlock(t('name: Vietnamese Pho Restaurant', { size: 15, color: C.muted })),
        ]}), { height: 160, fill: '#E6F4F1' }),
        surface(jsxs('vstack', { gap: 10, children: [
          textBlock(t('Isolation rules', { size: 18, weight: 700, color: C.coral })),
          bulletList([
'Do not use tenant_a again.',
'Every persistent query has a tenant_id filter.',
'Redis key is namespaced by Owner/tenant/session.',
            'FE query key scope theo tenant and session.',
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
    title: 'Staff uses JWT + PermissionGuard; customer uses session scope',
subtitle: 'The two actors have different auth models but both go through the tenant context.',
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
        node('TCP service Call', 'tenant-scoped payload', { width: 170, fill: '#E6F4F1' }),
      ]}),
      jsxs('hstack', { width: 'fill', gap: 18, children: [
        surface(jsxs('vstack', { gap: 12, children: [
          textBlock(t('Staff/Admin endpoints', { size: 19, weight: 700, color: C.blue })),
          bulletList([
            'Keycloak access token in Authorization header.',
            'Authorizer validate token, role mapping and permissions from MongoDB.',
'BFF PermissionGuard is the real source of truth.',
          ], { size: 15 }),
        ]}), { height: 180 }),
        surface(jsxs('vstack', { gap: 12, children: [
          textBlock(t('Customer endpoints', { size: 19, weight: 700, color: C.teal })),
          bulletList([
'There is no DB role CUSTOMER.',
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
title: 'A valid API staff must pass authenticate, tenant and authorize',
    subtitle: 'Example: waiter confirm order pending.',
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
['Happy path', 'valid JWT, correct tenant, permission order.confirm', '200 + order PROCESSING'],
['JWT expired', 'Access token expired', '401'],
        ['Role mismatch', 'Keycloak roles not giao with DB roles', '401'],
['tenant mismatch', 'User tenant A calls x-tenant-id tenant B', '403'],
['Permission denied', 'Chef/Barista calls raw confirm order endpoint', '403'],
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
title: 'Customer not login; QR validates tenant/table, then Order creates the table session',
subtitle: 'Order session is source of truth for customer ordering, separate from BFF anonymous session.',
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
['Case', 'Condition', 'Expected result'],
['Happy path', 'Slug and QR token valid', 'Session active, PWA into menu/order flow'],
['Invalid QR', 'Token is wrong or has been regenerated', 'Reject, not join session'],
['Unknown tenant', 'Slug not exists', 'Resolve fail'],
['Redis lost key', 'PostgreSQL session is still valid', 'Rehydrate Redis session'],
        ['Wrong session Owner', 'x-session-id not belongs to tenant/table', 'Security/session error'],
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
title: 'Cart is draft order in Redis; order row is created only when customer submit',
subtitle: 'CartVersion is concurrency token from server, client not incremented by the client.',
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
'Mutation must send expectedCartVersion.',
            '409 CART_VERSION_CONFLICT → refetch cart + toast.',
'Bill request locks ordering/cart.',
          ], { size: 13 }),
        ]}), { height: 180 }),
        matrix([
          ['Case', 'Expected'],
['Cart version matches', 'Update successful, server increases version'],
['Stale version', '409 conflict, PWA refetch'],
['Submit with duplicate idempotency key', 'Do not create duplicate order'],
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
title: 'Confirm order is intersection of RBAC, stock consistency and Kafka event',
subtitle: 'Order changes PENDING → PROCESSING only after Catalog deduct stock successfully.',
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
textBlock(t('order.confirmed is domain event currently triggering Kitchen; Notification/Analytics is future expansion. Producer not waiting for consumer; event logged via simplified outbox to reduce dual-write risk.', { size: 15, color: C.muted })),
        ]}), { height: 150, fill: '#FFF1E8' }),
        matrix([
          ['Failure case', 'Expected behavior'],
['Stock missing', 'Order kept PENDING, returned item details'],
          ['Order already PROCESSING', 'Reject invalid transition'],
['Kafka temporary error', 'Outbox holds retry/pending status'],
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
    title: 'Realtime UI uses BFF Direct; domain event uses Kafka',
subtitle: 'WebSocket is just a hint for the client to refetch REST, not replacing REST as the source of truth.',
    children: jsxs('vstack', { width: 'fill', gap: 18, children: [
      jsxs('hstack', { width: 'fill', gap: 14, align: 'center', children: [
node('Order submitted', 'BFF receives response from Order TCP', { width: 190, fill: '#FFF8EC' }),
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
bulletList(['order.confirmed in Phase 2A', 'payment.completed/refunded in Phase 3', 'kitchen.sla_warning in Phase 2B/4A', 'tenant.created in SaaS onboarding'], { size: 14 }),
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
title: 'service request, bill request and transfer table extends the ordering flow',
subtitle: 'These three flows prove that session/table/order/bill cannot be separated at POS runtime.',
    children: jsxs('vstack', { width: 'fill', gap: 14, children: [
      surface(jsxs('vstack', { gap: 8, children: [
        textBlock(t('service request', { size: 18, weight: 700, color: C.teal })),
        flow([['Customer request', 'CALL_STAFF / GENERAL_HELP'], ['Order service', 'create service request'], ['BFF Direct', 'service.requested'], ['Staff inbox', 'acknowledge / resolve']], { nodeWidth: 178, nodeHeight: 70 }),
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
    title: 'Business errors are clearly named so the UI knows to refetch, retry or stop',
    subtitle: 'Unified response wrapper helps frontend handle errors and logging by processID/duration.',
    children: jsxs('vstack', { width: 'fill', gap: 16, children: [
      surface(textBlock(t('{ data, message, statusCode, duration, processID }', { size: 24, weight: 700, color: C.teal })), { height: 72, fill: '#E6F4F1', line: '#C5E5DE' }),
      matrix([
        ['Error code', 'When does it occur', 'What should the UI/system do'],
        ['CART_VERSION_CONFLICT', 'Client sends old expectedCartVersion', 'Refetch cart, toast conflict, not automatically increasing version'],
        ['ITEM_UNAVAILABLE', 'Item can no longer be ordered', 'Disable/remove item'],
        ['PRICE_CHANGED', 'Price changed compared to cart snapshot', 'Showing new price, re-confirmation required'],
        ['INSUFFICIENT_STOCK', 'Confirmation failed due to lack of stock', 'Hold order PENDING, staff processes replacement/cancel'],
        ['BILL_NOT_READY', 'Calling invoice too early', 'Notification of order/item not yet qualified'],
        ['TENANT_MISMATCH', 'Wrong tenant/session across domain', 'Security error, not auto retry'],
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
    title: 'Testing is organized by layer and by business flow',
    subtitle: 'Goal is not just passing unit test, but proving the UI → BFF → service → DB/Redis/Kafka flow is correct.',
    children: jsxs('hstack', { width: 'fill', gap: 16, children: [
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Unit tests', { size: 19, weight: 700, color: C.blue })),
        bulletList(['Cart version conflict', 'Order lifecycle', 'Bill totals', 'Session policy', 'Transfer service', 'Permission guard'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Integration tests', { size: 19, weight: 700, color: C.teal })),
        bulletList(['BFF controller → TCP payload', 'Order → Catalog deduct stock', 'Redis session/cart', 'Outbox event creation', 'tenant filtering'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Frontend tests', { size: 19, weight: 700, color: C.amber })),
        bulletList(['React Query keys tenant/session scoped', 'Cart mutation rollback/refetch', 'POS polling and invalidation', 'QR URL/tenant slug', 'Toast/error states'], { size: 14 }),
      ]}), { height: 320 }),
      surface(jsxs('vstack', { gap: 12, children: [
        textBlock(t('Manual E2E demo', { size: 19, weight: 700, color: C.coral })),
        bulletList(['QR join', 'Menu + cart', 'Submit order', 'Staff confirmation', 'Tracking update', 'service request/transfer'], { size: 14 }),
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
title: 'Important test cases for each flow',
subtitle: 'Each flow needs happy path, authorization failure, tenant/session mismatch and consistency edge case.',
    children: matrix([
      ['Flow', 'Happy case', 'Failure / edge case', 'Expected'],
['Login / RBAC', 'Valid JWT, role matches Mongo', 'JWT expired / missing permission', '200 or 401/403 clear'],
['QR join', 'Slug + valid token', 'Wrong token, old token after regenerate', 'Do not join session'],
['Menu', 'Menu correct tenant', 'Old cache or other tenant', 'Do not expose cross-tenant data'],
['Cart', 'Matching version', 'Stale version, bill locked', '409 conflict or reject mutate'],
['Submit order', 'Cart has items', 'Duplicate idempotency key', 'Do not create duplicate'],
['Confirm order', 'Enough stock', 'Insufficient stock / invalid state', 'PROCESSING or keep PENDING'],
['service/Bill/Transfer', 'Session/table valid', 'Session invalid, destination table occupied', 'Reject not orphan data'],
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
kicker: '19 · Implementation status',
title: 'Phase 2A already realizes deep end-to-end ordering flow',
subtitle: 'Should be presented as “Phase 2A scope completed”, not overclaim production-ready.',
    children: jsxs('hstack', { width: 'fill', gap: 18, children: [
      surface(jsxs('vstack', { gap: 12, children: [
textBlock(t('Already implemented in code', { size: 20, weight: 700, color: C.teal })),
        bulletList([
          'Order service: session, cart, order, bill, service request, transfer, outbox.',
          'BFF: customer/admin order REST + WebSocket gateway.',
          'Customer PWA: real tenant/session/cart/order/service/bill APIs.',
          'Management App: real POS orders, service inbox, transfer, QR dynamic tenant.',
          'Canonical reseed tenant pho-viet.',
        ], { size: 14 }),
      ]}), { height: 360 }),
      surface(jsxs('vstack', { gap: 12, children: [
textBlock(t('Do not overclaim', { size: 20, weight: 700, color: C.coral })),
        bulletList([
          'Cash/SePay VietQR payment confirmation belongs to Phase 3.',
          'KDS full realtime and Redis Adapter belongs to Phase 2B.',
          'Full saga/outbox hardening belongs to Phase 4A.',
          'SaaS onboarding self-service belongs to Phase 4B.',
          'Observability/Grafana tracing is phase sau.',
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
    title: 'Demo should demonstrate architecture, not just click through UI',
    subtitle: 'Each demo step should clearly state which components the request goes through and where the state changes.',
    children: jsxs('hstack', { width: 'fill', gap: 18, children: [
      surface(numbered([
        'Reseed dev with tenant pho-viet.',
        'Open Management App to see table and QR.',
        'Open Customer PWA from QR URL.',
        'Resolve tenant, validate QR, join session.',
        'See real menu, add items to cart Redis.',
        'Submit order creates PENDING order.',
        'POS sees order pending.',
        'Waiter confirmation order, Catalog deduct stock.',
        'Customer tracking status update.',
        'Send service request or transfer table.',
      ], { size: 14 }), { height: 390 }),
      surface(jsxs('vstack', { gap: 14, children: [
        textBlock(t('Speech throughout demo', { size: 20, weight: 700, color: C.teal })),
        textBlock(t('A UI operation goes through the BFF guard/controller, turns into a TCP command to the service that owns the domain, records PostgreSQL/Redis, then returns a response or broadcasts a realtime/Kafka event in the correct role.', { size: 21, color: C.ink })),
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
    title: 'Core architecture already proves ordering flow; The following phases expand operational depth',
    subtitle: 'This deck can continue to grow into an official protective slide when the next phases are completed.',
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
        textBlock(t('Conclusion', { size: 20, weight: 700, color: C.teal })),
        textBlock(t('QRTable is not just a QR ordering app. This is a multi-tenant SaaS POS platform, with BFF controlling auth/RBAC, service boundary by ownership, Redis for runtime state, Kafka for domain event and flow ordering end-to-end already realized to Phase 2A.', { size: 22, color: C.ink })),
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
source requirements: local docs/business-logic.md, docs/technical-architecture.md, docs/implementation_plan.md, docs/phases/phase-2a-order-kafka.md, docs/phases/phase-2b-kitchen-websocket.md, docs/specs/business-logic-step-2.4-spec.md, docs/architecture/permission-matrix.md, docs/references/auth-system-reference.md, recent git log
known missing inputs: official university template and presenter/student metadata are not provided
`;
await fs.writeFile(path.join(workspace, 'profile-plan.txt'), profilePlan, 'utf8');

const sourceNotes = `Sources used:
- docs/business-logic.md
- docs/technical-architecture.md
- docs/implementation_plan.md
- docs/phases/phase-2a-order-kafka.md
- docs/specs/business-logic-step-2.4-spec.md
- docs/architecture/permission-matrix.md
- docs/references/auth-system-reference.md
- docs/phases/phase-2a-order-kafka.md
- docs/phases/phase-2b-kitchen-websocket.md
- git log --oneline --decorate -12

No external brand assets used. QRTable wordmark is represented as plain editable text only.
`;
await fs.writeFile(path.join(workspace, 'source-notes.txt'), sourceNotes, 'utf8');

console.log(JSON.stringify({ workspace, slidesDir, slideCount: slides.length }, null, 2));
