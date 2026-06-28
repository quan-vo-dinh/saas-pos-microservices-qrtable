#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error('Usage: node tests/benchmark/k6-summary-to-md.js <summary.json> <summary.md>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const summary = JSON.parse(raw);
const metrics = summary.metrics || {};

function value(metricName, valueName) {
  const metric = metrics[metricName];
  if (!metric || typeof metric !== 'object') {
    return null;
  }

  const metricValues = metric.values && typeof metric.values === 'object' ? metric.values : metric;
  const metricValue = metricValues[valueName] ?? (valueName === 'rate' ? metricValues.value : undefined);
  return typeof metricValue === 'number' ? metricValue : null;
}

function formatNumber(input, digits = 2) {
  return typeof input === 'number' && Number.isFinite(input) ? input.toFixed(digits) : 'N/A';
}

function formatRate(input) {
  return typeof input === 'number' && Number.isFinite(input) ? `${(input * 100).toFixed(2)}%` : 'N/A';
}

function metricRow(label, metricName) {
  return [
    label,
    formatNumber(value(metricName, 'avg')),
    formatNumber(value(metricName, 'med')),
    formatNumber(value(metricName, 'p(95)')),
    formatNumber(value(metricName, 'p(99)')),
    formatNumber(value(metricName, 'min')),
    formatNumber(value(metricName, 'max')),
  ];
}

const httpRequests = value('http_reqs', 'count');
const httpRequestRate = value('http_reqs', 'rate');
const failedRate = value('http_req_failed', 'rate');
const checkRate = value('checks', 'rate');
const checksPassed = value('checks', 'passes');
const checksFailed = value('checks', 'fails');
const rows = [
  ['Metric', 'Avg', 'Median', 'p95', 'p99', 'Min', 'Max'],
  metricRow('HTTP request duration (ms)', 'http_req_duration'),
  metricRow('Iteration duration (ms)', 'iteration_duration'),
];

const markdown = `# k6 Summary

> Generated from \`${path.basename(inputPath)}\`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field | Value |
| --- | --- |
| Generated at | ${new Date().toISOString()} |
| Source JSON | \`${path.basename(inputPath)}\` |
| BASE_URL | \`${process.env.BASE_URL || 'not recorded by summarizer'}\` |
| TENANT_ID | \`${process.env.TENANT_ID || 'not recorded by summarizer'}\` |

## Headline Metrics

| Metric | Value |
| --- | --- |
| HTTP requests | ${formatNumber(httpRequests, 0)} |
| HTTP request rate | ${formatNumber(httpRequestRate)} req/s |
| HTTP failed rate | ${formatRate(failedRate)} |
| Check pass rate | ${formatRate(checkRate)} |
| Checks passed | ${formatNumber(checksPassed, 0)} |
| Checks failed | ${formatNumber(checksFailed, 0)} |

## Latency

${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdown);
