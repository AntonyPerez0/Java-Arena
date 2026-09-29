// Node worker thread for the 'streaming' test cases: runs one program and posts every onOutput
// chunk. The program never ends; run-tests.mjs terminates this thread.
import { parentPort, workerData } from 'node:worker_threads';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { createRunner } = await import(pathToFileURL(join(workerData.dist, 'runner-host.mjs')).href);
const runner = await createRunner();
parentPort.postMessage({ type: 'started' });
await runner.run({ ...workerData.request, onOutput: (stream, text) => parentPort.postMessage({ type: 'output', stream, text }) });
