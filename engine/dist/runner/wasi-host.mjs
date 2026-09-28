// Minimal WASI preview 2 host for the Java Arena runner component.
//
// Pure JavaScript, so it behaves the same in a browser Worker and in Node. It replaces
// @bytecodealliance/preview2-shim's browser build, whose in-memory file system ignores truncate,
// append, unlink and rename (the reason java.nio.file writes never finished in the browser).
// Everything is synchronous: streams and file data live in memory, so every pollable is ready
// except clock timers, which are honoured by waiting.

const encoder = new TextEncoder();
const MAX_WRITE = 1n << 20n;

class IoError {
  constructor(message) {
    this.message = message;
  }
  toDebugString() {
    return this.message;
  }
}

class Pollable {
  constructor(deadlineNs) {
    this.deadlineNs = deadlineNs;
  }
  ready() {
    return this.deadlineNs === undefined || monotonicNow() >= this.deadlineNs;
  }
  block() {
    // Workers may block, and there is nothing else to wait for.
    while (!this.ready());
  }
}

function monotonicNow() {
  return BigInt(Math.round(performance.now() * 1e6));
}

function poll(list) {
  if (list.length === 0) throw new Error('poll list must not be empty');
  for (;;) {
    const ready = [];
    list.forEach((pollable, index) => pollable.ready() && ready.push(index));
    if (ready.length) return new Uint32Array(ready);
  }
}

class InputStream {
  constructor(readChunk) {
    this.readChunk = readChunk;
  }
  read(len) {
    const bytes = this.readChunk(Number(len));
    if (bytes === null) throw { tag: 'closed' };
    return bytes;
  }
  blockingRead(len) {
    return this.read(len);
  }
  skip(len) {
    return BigInt(this.read(len).byteLength);
  }
  blockingSkip(len) {
    return this.skip(len);
  }
  subscribe() {
    return new Pollable();
  }
}

class OutputStream {
  constructor(writeChunk) {
    this.writeChunk = writeChunk;
  }
  checkWrite() {
    return MAX_WRITE;
  }
  write(bytes) {
    this.writeChunk(bytes);
  }
  blockingWriteAndFlush(bytes) {
    this.writeChunk(bytes);
  }
  flush() {}
  blockingFlush() {}
  writeZeroes(len) {
    this.writeChunk(new Uint8Array(Number(len)));
  }
  blockingWriteZeroesAndFlush(len) {
    this.writeZeroes(len);
  }
  splice(source, len) {
    let bytes;
    try {
      bytes = source.read(len);
    } catch (error) {
      if (error?.tag === 'closed') throw error;
      throw { tag: 'last-operation-failed', val: new IoError(String(error)) };
    }
    this.writeChunk(bytes);
    return BigInt(bytes.byteLength);
  }
  blockingSplice(source, len) {
    return this.splice(source, len);
  }
  subscribe() {
    return new Pollable();
  }
}

// ---- In-memory file system -------------------------------------------------------------------

let nextInode = 1n;

function timestamp() {
  const ms = Date.now();
  return { seconds: BigInt(Math.floor(ms / 1000)), nanoseconds: (ms % 1000) * 1e6 };
}

/** A directory node: `entries` maps a name to a node. */
export function dirNode(readOnly = false) {
  return { kind: 'dir', entries: new Map(), inode: nextInode++, mtime: timestamp(), readOnly };
}

/** A regular file node. */
export function fileNode(data = new Uint8Array(0), readOnly = false) {
  return { kind: 'file', data, size: data.byteLength, inode: nextInode++, mtime: timestamp(), readOnly };
}

function fileBytes(node) {
  return node.data.subarray(0, node.size);
}

function ensureCapacity(node, size) {
  if (size <= node.data.byteLength) return;
  const grown = new Uint8Array(Math.max(size, node.data.byteLength * 2, 256));
  grown.set(node.data.subarray(0, node.size));
  node.data = grown;
}

function writeAt(node, offset, bytes) {
  if (node.readOnly) throw 'read-only';
  const end = offset + bytes.byteLength;
  ensureCapacity(node, end);
  if (offset > node.size) node.data.fill(0, node.size, offset);
  node.data.set(bytes, offset);
  node.size = Math.max(node.size, end);
  node.mtime = timestamp();
}

function setSize(node, size) {
  if (node.readOnly) throw 'read-only';
  if (size > node.size) {
    ensureCapacity(node, size);
    node.data.fill(0, node.size, size);
  }
  node.size = size;
  node.mtime = timestamp();
}

/** Split a relative path into its parent directory node and final name. */
function walk(start, path, followLast) {
  if (path.startsWith('/')) throw 'not-permitted';
  const names = path.split('/').filter((name) => name !== '' && name !== '.');
  const stack = [start];
  for (let i = 0; i < names.length - (followLast ? 0 : 1); i++) {
    const name = names[i];
    const current = stack[stack.length - 1];
    if (current.kind !== 'dir') throw 'not-directory';
    if (name === '..') {
      if (stack.length === 1) throw 'not-permitted';
      stack.pop();
      continue;
    }
    const child = current.entries.get(name);
    if (!child) throw 'no-entry';
    stack.push(child);
  }
  const parent = stack[stack.length - 1];
  if (followLast) return { node: parent };
  const name = names.length ? names[names.length - 1] : '.';
  if (parent.kind !== 'dir') throw 'not-directory';
  if (name === '..') {
    if (stack.length === 1) throw 'not-permitted';
    return { node: stack[stack.length - 2] };
  }
  if (name === '.') return { node: parent };
  return { parent, name, node: parent.entries.get(name) };
}

function lookup(start, path) {
  const { node } = walk(start, path, false);
  if (!node) throw 'no-entry';
  return node;
}

function statOf(node) {
  return {
    type: node.kind === 'dir' ? 'directory' : 'regular-file',
    linkCount: 1n,
    size: BigInt(node.kind === 'dir' ? 4096 : node.size),
    dataAccessTimestamp: node.mtime,
    dataModificationTimestamp: node.mtime,
    statusChangeTimestamp: node.mtime,
  };
}

class DirectoryEntryStream {
  constructor(entries) {
    this.entries = entries;
    this.index = 0;
  }
  readDirectoryEntry() {
    if (this.index >= this.entries.length) return undefined;
    return this.entries[this.index++];
  }
}

class Descriptor {
  constructor(node, flags) {
    this.node = node;
    this.flags = flags;
  }
  readViaStream(offset) {
    const node = this.node;
    if (node.kind === 'dir') throw 'is-directory';
    let position = Number(offset);
    return new InputStream((len) => {
      if (position >= node.size) return null;
      const bytes = node.data.slice(position, Math.min(node.size, position + len));
      position += bytes.byteLength;
      return bytes;
    });
  }
  writeViaStream(offset) {
    const node = this.node;
    if (node.kind === 'dir') throw 'is-directory';
    let position = Number(offset);
    return new OutputStream((bytes) => {
      writeAt(node, position, bytes);
      position += bytes.byteLength;
    });
  }
  appendViaStream() {
    const node = this.node;
    if (node.kind === 'dir') throw 'is-directory';
    return new OutputStream((bytes) => writeAt(node, node.size, bytes));
  }
  advise() {}
  syncData() {}
  sync() {}
  getFlags() {
    return this.flags;
  }
  getType() {
    return this.node.kind === 'dir' ? 'directory' : 'regular-file';
  }
  setSize(size) {
    if (this.node.kind === 'dir') throw 'is-directory';
    setSize(this.node, Number(size));
  }
  setTimes() {}
  setTimesAt() {}
  read(length, offset) {
    if (this.node.kind === 'dir') throw 'is-directory';
    const start = Number(offset);
    const end = Math.min(this.node.size, start + Number(length));
    const bytes = start < end ? this.node.data.slice(start, end) : new Uint8Array(0);
    return [bytes, end >= this.node.size];
  }
  write(bytes, offset) {
    if (this.node.kind === 'dir') throw 'is-directory';
    writeAt(this.node, Number(offset), bytes);
    return BigInt(bytes.byteLength);
  }
  readDirectory() {
    if (this.node.kind !== 'dir') throw 'not-directory';
    const entries = [...this.node.entries]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, node]) => ({ type: node.kind === 'dir' ? 'directory' : 'regular-file', name }));
    return new DirectoryEntryStream(entries);
  }
  createDirectoryAt(path) {
    const { parent, name, node } = walk(this.node, path, false);
    if (node || !parent) throw 'exist';
    if (parent.readOnly) throw 'read-only';
    parent.entries.set(name, dirNode());
  }
  stat() {
    return statOf(this.node);
  }
  statAt(_pathFlags, path) {
    return statOf(lookup(this.node, path));
  }
  linkAt() {
    throw 'not-permitted';
  }
  openAt(_pathFlags, path, openFlags, flags) {
    let { parent, name, node } = walk(this.node, path, false);
    if (node) {
      if (openFlags.create && openFlags.exclusive) throw 'exist';
      if (openFlags.directory && node.kind !== 'dir') throw 'not-directory';
      if (node.kind === 'dir' && (flags.write || openFlags.truncate)) throw 'is-directory';
    } else {
      if (!openFlags.create) throw 'no-entry';
      if (parent.readOnly) throw 'read-only';
      node = openFlags.directory ? dirNode() : fileNode();
      parent.entries.set(name, node);
    }
    if (openFlags.truncate && node.kind === 'file') setSize(node, 0);
    return new Descriptor(node, flags);
  }
  readlinkAt(path) {
    lookup(this.node, path);
    throw 'invalid';
  }
  removeDirectoryAt(path) {
    const { parent, name, node } = walk(this.node, path, false);
    if (!node) throw 'no-entry';
    if (!parent) throw 'invalid';
    if (node.kind !== 'dir') throw 'not-directory';
    if (node.entries.size) throw 'not-empty';
    if (parent.readOnly) throw 'read-only';
    parent.entries.delete(name);
  }
  renameAt(oldPath, newDescriptor, newPath) {
    const from = walk(this.node, oldPath, false);
    if (!from.node) throw 'no-entry';
    const to = walk(newDescriptor.node, newPath, false);
    if (!from.parent || !to.parent) throw 'invalid';
    if (from.parent.readOnly || to.parent.readOnly) throw 'read-only';
    if (to.node === from.node) return;
    if (to.node) {
      if (to.node.kind === 'dir' && from.node.kind !== 'dir') throw 'is-directory';
      if (to.node.kind !== 'dir' && from.node.kind === 'dir') throw 'not-directory';
      if (to.node.kind === 'dir' && to.node.entries.size) throw 'not-empty';
    }
    from.parent.entries.delete(from.name);
    to.parent.entries.set(to.name, from.node);
  }
  symlinkAt() {
    throw 'not-permitted';
  }
  unlinkFileAt(path) {
    const { parent, name, node } = walk(this.node, path, false);
    if (!node) throw 'no-entry';
    if (node.kind === 'dir') throw 'is-directory';
    if (parent.readOnly) throw 'read-only';
    parent.entries.delete(name);
  }
  isSameObject(other) {
    return other.node === this.node;
  }
  metadataHash() {
    return { upper: this.node.inode, lower: 0n };
  }
  metadataHashAt(_pathFlags, path) {
    return { upper: lookup(this.node, path).inode, lower: 0n };
  }
}

/** Build a directory tree from `{ 'a/b.txt': Uint8Array }`. */
export function treeFromFiles(files, readOnly = false) {
  const root = dirNode(readOnly);
  for (const [path, bytes] of Object.entries(files)) {
    const names = path.split('/').filter(Boolean);
    if (names.some((name) => name === '.' || name === '..')) throw new Error(`Invalid path: ${path}`);
    let dir = root;
    for (const name of names.slice(0, -1)) {
      let next = dir.entries.get(name);
      if (!next) dir.entries.set(name, (next = dirNode(readOnly)));
      dir = next;
    }
    if (!path.endsWith('/')) dir.entries.set(names.at(-1), fileNode(bytes, readOnly));
  }
  return root;
}

/** Flatten a directory tree back to `{ 'a/b.txt': Uint8Array }` (files only). */
export function filesFromTree(root, prefix = '', out = {}) {
  for (const [name, node] of root.entries) {
    if (node.kind === 'dir') filesFromTree(node, `${prefix}${name}/`, out);
    else out[prefix + name] = fileBytes(node).slice();
  }
  return out;
}

/**
 * Create the import object. `state` is mutable so one component instance can serve many runs:
 * `state.root` (directory node for "/"), `state.cwd`, `state.stdout(bytes)`, `state.stderr(bytes)`.
 */
export function createWasiImports(state) {
  const rootDescriptor = () => new Descriptor(state.root, { read: true, write: true, mutateDirectory: true });
  const stdin = new InputStream(() => null);
  const stdout = new OutputStream((bytes) => state.stdout(bytes));
  const stderr = new OutputStream((bytes) => state.stderr(bytes));
  class TerminalInput {}
  class TerminalOutput {}
  class Unsupported {
    constructor() {
      throw new Error('HTTP is not available');
    }
  }
  const randomBytes = (len) => {
    const bytes = new Uint8Array(Number(len));
    for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
    return bytes;
  };
  const randomU64 = () => new DataView(randomBytes(8).buffer).getBigUint64(0);
  const imports = {
    'wasi:cli/environment': {
      getEnvironment: () => [],
      getArguments: () => ['java'],
      initialCwd: () => state.cwd,
    },
    'wasi:cli/exit': {
      exit(status) {
        throw Object.assign(new Error('component exit'), { exitError: true, code: status.tag === 'err' ? 1 : 0 });
      },
      exitWithCode(code) {
        throw Object.assign(new Error('component exit'), { exitError: true, code });
      },
    },
    'wasi:cli/stdin': { getStdin: () => stdin },
    'wasi:cli/stdout': { getStdout: () => stdout },
    'wasi:cli/stderr': { getStderr: () => stderr },
    'wasi:cli/terminal-input': { TerminalInput },
    'wasi:cli/terminal-output': { TerminalOutput },
    'wasi:cli/terminal-stdin': { getTerminalStdin: () => undefined },
    'wasi:cli/terminal-stdout': { getTerminalStdout: () => undefined },
    'wasi:cli/terminal-stderr': { getTerminalStderr: () => undefined },
    'wasi:clocks/monotonic-clock': {
      now: monotonicNow,
      resolution: () => 1000n,
      subscribeInstant: (instant) => new Pollable(BigInt(instant)),
      subscribeDuration: (duration) => new Pollable(monotonicNow() + BigInt(duration)),
    },
    'wasi:clocks/wall-clock': {
      now: timestamp,
      resolution: () => ({ seconds: 0n, nanoseconds: 1e6 }),
    },
    'wasi:filesystem/preopens': { getDirectories: () => [[rootDescriptor(), '/']] },
    'wasi:filesystem/types': {
      Descriptor,
      DirectoryEntryStream,
      filesystemErrorCode: () => undefined,
    },
    'wasi:http/outgoing-handler': {
      handle() {
        throw { tag: 'HTTP-request-denied' };
      },
    },
    'wasi:http/types': Object.fromEntries(
      ['Fields', 'FutureIncomingResponse', 'FutureTrailers', 'IncomingBody', 'IncomingResponse', 'OutgoingBody', 'OutgoingRequest', 'RequestOptions'].map((name) => [name, class extends Unsupported {}]),
    ),
    'wasi:io/error': { Error: IoError },
    'wasi:io/poll': { Pollable, poll },
    'wasi:io/streams': { InputStream, OutputStream },
    'wasi:random/random': { getRandomBytes: randomBytes, getRandomU64: randomU64 },
    'wasi:random/insecure': { getInsecureRandomBytes: randomBytes, getInsecureRandomU64: randomU64 },
    'wasi:random/insecure-seed': { insecureSeed: () => [randomU64(), randomU64()] },
  };
  return imports;
}

export { encoder };
