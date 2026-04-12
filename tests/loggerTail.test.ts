import { randomUUID } from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { clearLogs, createLogger, tailLogs } from '../src/lib/logger.js';

const subscriptions: Array<() => void> = [];
const servicesToCleanup = new Set<string>();

function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = (): void => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for log tail event`));
        return;
      }

      setTimeout(poll, 25);
    };

    poll();
  });
}

afterEach(async () => {
  for (const unsubscribe of subscriptions.splice(0, subscriptions.length)) {
    unsubscribe();
  }

  for (const service of servicesToCleanup) {
    await clearLogs(service);
  }
  servicesToCleanup.clear();
});

describe('tailLogs', () => {
  it('creates missing log file and emits appended entries', async () => {
    const service = `tail-${randomUUID()}`;
    servicesToCleanup.add(service);

    const receivedMessages: string[] = [];
    const unsubscribe = tailLogs(service, (entry) => {
      receivedMessages.push(entry.message);
    });
    subscriptions.push(unsubscribe);

    const logger = createLogger(service);
    await logger.info('tail event smoke');

    await waitFor(() => receivedMessages.includes('tail event smoke'));
    expect(receivedMessages).toContain('tail event smoke');
  });
});
