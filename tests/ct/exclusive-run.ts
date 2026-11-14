/**
 * Refuses to start a component test run while another one is running.
 *
 * A run builds the stories into playwright/.cache and serves that folder on
 * one fixed port. A second run that starts while the first is building writes
 * the same folder under the first one's server, and a second run that finds
 * the port taken uses whatever server answers there. Either way a story's
 * module fails to load in the middle of a test that has nothing wrong with
 * it. Global setup runs before the build and its teardown after the server
 * stops, so the lock covers the whole run.
 */

import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CT_HOST = '127.0.0.1';
export const CT_PORT = 3100;

const lock = join(tmpdir(), `ui-kit-ct-${CT_PORT}.lock`);

function running(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function portFree() {
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(CT_PORT, CT_HOST, () => server.close(() => resolve(true)));
  });
}

export default async function exclusiveRun() {
  try {
    writeFileSync(lock, String(process.pid), { flag: 'wx' });
  } catch {
    const holder = Number(readFileSync(lock, 'utf8'));
    if (running(holder))
      throw new Error(
        `Another component test run (process ${holder}) is using ${CT_HOST}:${CT_PORT} and playwright/.cache. Wait for it to finish.`,
      );
    writeFileSync(lock, String(process.pid));
  }
  if (!(await portFree())) {
    unlinkSync(lock);
    throw new Error(
      `${CT_HOST}:${CT_PORT} is taken by another process. Stop it before running the component tests.`,
    );
  }
  return () => unlinkSync(lock);
}
