// Test Worker: loads runner-host.mjs from the dist URL given by the page.
let runner;
self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'init') {
      const { createRunner } = await import(new URL('runner-host.mjs', data.dist).href);
      const fetchAsset = (name) => fetch(new URL(name, data.dist));
      runner = await createRunner({ fetchAsset, modules: data.modules, freshInstance: data.freshInstance });
      self.postMessage({ id, result: runner.timings });
    } else if (type === 'modules') {
      self.postMessage({ id, result: runner.modules });
    } else if (type === 'run') {
      const request = data.request;
      request.classes = request.classes.map((c) => ({ path: c.path, bytes: Uint8Array.from(atob(c.base64), (ch) => ch.charCodeAt(0)) }));
      const result = await runner.run(request);
      const files = Object.fromEntries(Object.entries(result.files).map(([name, bytes]) => [name, Array.from(bytes)]));
      self.postMessage({ id, result: { ...result, files } });
    }
  } catch (error) {
    self.postMessage({ id, error: String(error?.stack ?? error) });
  }
};
