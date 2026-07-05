import { test, expect, type TestInfo } from '@playwright/test';
import { allure } from 'allure-playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type BffEvidence = {
  kind: 'bff-scale-out';
  endpoints: { bffA: string; bffB: string; apiPrefix: string };
  seed: Record<string, unknown>;
  socket: Record<string, unknown>;
  command: Record<string, unknown>;
  event: {
    firstEvent: { cartVersion: number; items: Array<{ quantity: number }> };
    receivedCount: number;
    duplicateCount: number;
    receivedEvents: unknown[];
  };
  readBack: { response: { cartVersion: number; items: Array<{ quantity: number }> } };
  conclusion: Record<string, unknown>;
};

type OrderEvidence = {
  kind: 'order-scale-out';
  endpoints: Record<string, unknown>;
  cartContinuity: {
    mutated: { instance: string; port: number; response: { cartVersion: number } };
    readBack: { instance: string; port: number; response: { cartVersion: number; items: Array<{ quantity: number }> } };
  };
  submitReplay: {
    idempotencyKey: string;
    concurrentRequests: Array<{ index: number; targetInstance: string; port: number }>;
    results: Array<{ status: string }>;
    persistedOrders: Array<{ id: string; status: string; idempotencyKey: string }>;
  };
  confirmConcurrency: {
    concurrentRequests: Array<{ index: number; targetInstance: string; port: number; orderId: string }>;
    results: Array<{ status: string; errorCode?: string }>;
    finalStock: number;
    orderStatuses: Array<{ id: string; status: string }>;
    orderConfirmedOutboxRows: Array<{ id: string; status: string }>;
  };
  conclusion: Record<string, unknown>;
};

const execFileAsync = promisify(execFile);
const SCALE_OUT_SCREENSHOT_DIR = 'docs/graduation-thesis-resources/thesis-report/assets/screenshots';

test.describe('Functional Scale-Out Evidence', () => {
  test.describe.configure({ mode: 'serial' });

  test('Docker topology shows two BFF and two Order instances', async (_, testInfo) => {
    test.skip(process.env['SKIP_SCALE_OUT_ALLURE'] === '1', 'Scale-out Allure evidence skipped');
    await setAllureMetadata({
      feature: 'Docker multi-instance topology',
      story: 'BFF and Order are replicated on local Docker Compose',
    });

    await allure.step('Attach expected topology diagram', async () => {
      await attachSvg(testInfo, 'scale-out-topology.svg', buildTopologySvg());
    });

    const composeOutput = await readComposePs();
    await allure.step('Attach Docker Compose process table', async () => {
      await attachText(testInfo, 'docker-compose-ps.txt', composeOutput);
    });

    await allure.step('Assert multi-instance services are running', async () => {
      for (const service of ['bff-a', 'bff-b', 'order-a', 'order-b', 'postgres', 'redis', 'kafka']) {
        expect(composeOutput).toContain(service);
      }
      expect(composeOutput).toMatch(/bff-a[\s\S]*healthy/);
      expect(composeOutput).toMatch(/bff-b[\s\S]*healthy/);
      expect(composeOutput).toMatch(/order-a[\s\S]*healthy/);
      expect(composeOutput).toMatch(/order-b[\s\S]*healthy/);
    });

    await attachJson(testInfo, 'screenshot-targets.json', {
      recommendedScreenshots: [
        `${SCALE_OUT_SCREENSHOT_DIR}/chapter6-27-scale-out-compose-ps.png`,
        `${SCALE_OUT_SCREENSHOT_DIR}/chapter6-28-scale-out-bff-allure-flow.png`,
        `${SCALE_OUT_SCREENSHOT_DIR}/chapter6-29-scale-out-order-allure-flow.png`,
      ],
    });
  });

  test('BFF realtime fan-out is delivered from BFF-A to a client on BFF-B', async (_, testInfo) => {
    test.skip(process.env['SKIP_SCALE_OUT_ALLURE'] === '1', 'Scale-out Allure evidence skipped');
    await setAllureMetadata({
      feature: 'BFF realtime cross-instance fan-out',
      story: 'Socket.IO Redis Adapter forwards cart update from BFF-A to BFF-B client',
    });

    await allure.step('Attach BFF realtime flow diagram', async () => {
      await attachSvg(testInfo, 'bff-realtime-cross-instance.svg', buildBffRealtimeSvg());
    });

    let evidence!: BffEvidence;
    await allure.step('Run BFF scale-out evidence collector', async () => {
      evidence = await runEvidenceCollector<BffEvidence>('bff');
      await attachJson(testInfo, 'bff-scale-out-evidence.json', evidence);
    });

    await allure.step('Show seed and socket placement', async () => {
      await attachJson(testInfo, 'bff-seed-and-socket.json', {
        endpoints: evidence.endpoints,
        seed: evidence.seed,
        socket: evidence.socket,
      });
    });

    await allure.step('Show command through BFF-A and event delivered on BFF-B', async () => {
      await attachJson(testInfo, 'bff-command-and-event.json', {
        command: evidence.command,
        event: evidence.event,
      });
      expect(evidence.event.receivedCount).toBeGreaterThanOrEqual(1);
      expect(evidence.event.firstEvent.cartVersion).toBe(2);
      expect(evidence.event.firstEvent.items[0]?.quantity).toBe(2);
    });

    await allure.step('Assert BFF-B read-back sees shared cart state', async () => {
      await attachJson(testInfo, 'bff-read-back-and-conclusion.json', {
        readBack: evidence.readBack,
        conclusion: evidence.conclusion,
      });
      expect(evidence.readBack.response.cartVersion).toBe(2);
      expect(evidence.readBack.response.items[0]?.quantity).toBe(2);
    });
  });

  test('Order service preserves idempotency and stock invariants across Order-A and Order-B', async (_, testInfo) => {
    test.skip(process.env['SKIP_SCALE_OUT_ALLURE'] === '1', 'Scale-out Allure evidence skipped');
    await setAllureMetadata({
      feature: 'Order multi-instance consistency',
      story: 'Order-A and Order-B share state and preserve business invariants',
    });

    await allure.step('Attach Order consistency flow diagram', async () => {
      await attachSvg(testInfo, 'order-multi-instance-consistency.svg', buildOrderConsistencySvg());
    });

    let evidence!: OrderEvidence;
    await allure.step('Run Order scale-out evidence collector', async () => {
      evidence = await runEvidenceCollector<OrderEvidence>('order');
      await attachJson(testInfo, 'order-scale-out-evidence.json', evidence);
    });

    await allure.step('Assert cart/session continuity across Order-A and Order-B', async () => {
      await attachJson(testInfo, 'order-cart-continuity.json', evidence.cartContinuity);
      expect(evidence.cartContinuity.mutated.response.cartVersion).toBe(2);
      expect(evidence.cartContinuity.readBack.response.cartVersion).toBe(2);
      expect(evidence.cartContinuity.readBack.response.items[0]?.quantity).toBe(3);
    });

    await allure.step('Assert idempotency replay creates only one order', async () => {
      await attachJson(testInfo, 'order-submit-idempotency.json', evidence.submitReplay);
      expect(evidence.submitReplay.results.every((result) => result.status === 'fulfilled')).toBe(true);
      expect(evidence.submitReplay.persistedOrders).toHaveLength(1);
      expect(evidence.submitReplay.persistedOrders[0].idempotencyKey).toBe(evidence.submitReplay.idempotencyKey);
    });

    await allure.step('Assert concurrent confirm keeps stock and order state valid', async () => {
      await attachJson(testInfo, 'order-confirm-concurrency-final-state.json', {
        confirmConcurrency: evidence.confirmConcurrency,
        conclusion: evidence.conclusion,
      });
      expect(evidence.confirmConcurrency.results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(evidence.confirmConcurrency.results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      expect(evidence.confirmConcurrency.finalStock).toBe(0);
      expect(evidence.confirmConcurrency.orderStatuses.filter((order) => order.status === 'PROCESSING')).toHaveLength(
        1,
      );
      expect(evidence.confirmConcurrency.orderStatuses.filter((order) => order.status === 'PENDING')).toHaveLength(1);
      expect(evidence.confirmConcurrency.orderConfirmedOutboxRows).toHaveLength(1);
    });
  });
});

async function setAllureMetadata(params: { feature: string; story: string }): Promise<void> {
  await allure.epic('Functional scale-out design');
  await allure.feature(params.feature);
  await allure.story(params.story);
  await allure.parentSuite('Architecture evidence');
  await allure.suite('Functional Scale-Out');
  await allure.tags('qrtable', 'scale-out', 'multi-instance', 'thesis-evidence');
  await allure.severity('critical');
  await allure.description(
    [
      'This test produces visual and structured evidence for QRTable functional scale-out design.',
      '',
      'Scope: local multi-instance smoke evidence, not a production throughput benchmark.',
    ].join('\n'),
  );
}

async function readComposePs(): Promise<string> {
  const { stdout } = await execFileAsync('bash', ['tools/scale-test/compose.sh', 'ps'], {
    cwd: process.cwd(),
  });
  return stdout;
}

async function runEvidenceCollector<T>(mode: 'bff' | 'order'): Promise<T> {
  const { stdout } = await execFileAsync(
    'node',
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'tools/scale-test/collect-scale-out-evidence.ts', mode],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TS_NODE_PROJECT: 'tools/scale-test/tsconfig.json',
      },
      maxBuffer: 1024 * 1024 * 10,
    },
  );
  return JSON.parse(stdout) as T;
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
}

async function attachText(testInfo: TestInfo, name: string, value: string): Promise<void> {
  await testInfo.attach(name, {
    body: value,
    contentType: 'text/plain',
  });
}

async function attachSvg(testInfo: TestInfo, name: string, svg: string): Promise<void> {
  await testInfo.attach(name, {
    body: svg,
    contentType: 'image/svg+xml',
  });
}

function buildTopologySvg(): string {
  return buildFlowSvg('QRTable functional scale-out topology', [
    ['BFF-A :4300', 'Shared Redis', 'BFF-B :4302'],
    ['Order-A TCP :4201', 'Shared Postgres / Kafka', 'Order-B TCP :4211'],
  ]);
}

function buildBffRealtimeSvg(): string {
  return buildFlowSvg('BFF realtime cross-instance flow', [
    ['Client socket', 'BFF-B /orders', 'Socket.IO room'],
    ['HTTP PATCH cart', 'BFF-A', 'Order service'],
    ['BFF-A emit', 'Redis Adapter', 'BFF-B delivers event'],
  ]);
}

function buildOrderConsistencySvg(): string {
  return buildFlowSvg('Order multi-instance consistency flow', [
    ['Test command', 'Order-A', 'Shared Redis cart'],
    ['Replay command', 'Order-B', 'Shared Postgres order'],
    ['Confirm race', 'Catalog stock', 'One success / one reject'],
  ]);
}

function buildFlowSvg(title: string, rows: Array<[string, string, string]>): string {
  const width = 980;
  const rowHeight = 120;
  const height = 90 + rows.length * rowHeight;
  const boxes = rows
    .map((row, rowIndex) => row.map((label, colIndex) => svgBox(label, 60 + colIndex * 310, 70 + rowIndex * rowHeight)))
    .flat()
    .join('\n');
  const arrows = rows.map((_, rowIndex) => svgRowArrows(260, 125 + rowIndex * rowHeight)).join('\n');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M2,2 L10,6 L2,10 Z" fill="#2563eb"/></marker></defs>',
    '<rect width="100%" height="100%" fill="#f8fafc"/>',
    `<text x="60" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>`,
    arrows,
    boxes,
    '</svg>',
  ].join('\n');
}

function svgBox(label: string, x: number, y: number): string {
  return [
    `<rect x="${x}" y="${y}" width="220" height="70" rx="8" fill="#ffffff" stroke="#0f766e" stroke-width="2"/>`,
    `<text x="${x + 110}" y="${y + 42}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#134e4a">${escapeXml(label)}</text>`,
  ].join('\n');
}

function svgRowArrows(startX: number, y: number): string {
  return [
    `<line x1="${startX}" y1="${y}" x2="${startX + 100}" y2="${y}" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow)"/>`,
    `<line x1="${startX + 310}" y1="${y}" x2="${startX + 410}" y2="${y}" stroke="#2563eb" stroke-width="3" marker-end="url(#arrow)"/>`,
  ].join('\n');
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    };
    return entities[char];
  });
}
