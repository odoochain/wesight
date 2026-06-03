import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { getExternalAgentEnvironmentSnapshot } from './externalAgentEnvironment';

let tempDir = '';
let originalPath = '';

const writeExecutable = (name: string, script: string): void => {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, script, 'utf8');
  fs.chmodSync(filePath, 0o755);
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wesight-agent-env-'));
  originalPath = process.env.PATH ?? '';
  process.env.PATH = `${tempDir}${path.delimiter}${originalPath}`;
});

afterEach(() => {
  process.env.PATH = originalPath;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('probes CLI commands asynchronously and isolates version timeouts', async () => {
  writeExecutable('claude', '#!/bin/sh\necho "claude-test 1.0.0"\n');
  writeExecutable('grok', '#!/bin/sh\nif [ "$1" = "--version" ]; then sleep 2; fi\n');

  const { snapshot, report } = await getExternalAgentEnvironmentSnapshot({
    appTypes: ['claude', 'grok'],
    includeUserShellPath: false,
    versionProbeTimeoutMsByAppType: {
      claude: 1500,
      grok: 300,
    },
  });
  const claude = snapshot.engines.find(engine => engine.appType === 'claude');
  const grok = snapshot.engines.find(engine => engine.appType === 'grok');
  const grokMetric = report.metrics.find(metric => metric.command === 'grok');

  expect(claude).toMatchObject({
    found: true,
    path: path.join(tempDir, 'claude'),
    version: 'claude-test 1.0.0',
  });
  expect(claude?.checking).toBeUndefined();
  expect(grok).toMatchObject({
    found: true,
    version: null,
  });
  expect(grokMetric).toMatchObject({
    command: 'grok',
    found: true,
    timedOut: true,
  });
});
