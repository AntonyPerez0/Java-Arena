// Tests of the content replay's sharding (shard.mjs). Needs no build output.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { parseShard, shardOf } from "./shard.mjs";

const programs = (n) => Array.from({ length: n }, (_, i) => ({ where: `module ${Math.floor(i / 7) + 1}, program ${i}` }));

test("no setting means no sharding: every program is replayed", () => {
  for (const spec of [undefined, null, "", "  "]) {
    assert.equal(parseShard(spec), null);
    const all = programs(10);
    assert.deepEqual(shardOf(all, parseShard(spec)), all);
  }
});

test("k/n is read with spaces allowed", () => {
  assert.deepEqual(parseShard("2/4"), { index: 2, count: 4 });
  assert.deepEqual(parseShard(" 1 / 1 "), { index: 1, count: 1 });
  assert.deepEqual(parseShard("3/3"), { index: 3, count: 3 });
});

test("a malformed or out-of-range setting is an error, never a silent full or empty run", () => {
  for (const spec of ["2", "2/", "/4", "a/b", "2/4/1", "-1/4", "1.5/4", "0/4", "5/4", "1/0", "0/0"]) assert.throws(() => parseShard(spec), /CONTENT_SHARD/, spec);
});

test("every program is in exactly one shard, the shards together keep the list's order, and their sizes differ by at most one", () => {
  for (const total of [0, 1, 2, 5, 7, 100, 1001]) {
    const all = programs(total);
    for (let count = 1; count <= 6; count++) {
      const shards = Array.from({ length: count }, (_, k) => shardOf(all, { index: k + 1, count }));
      const seen = new Map();
      for (const [k, s] of shards.entries()) for (const p of s) seen.set(p, [...(seen.get(p) ?? []), k]);
      assert.equal(seen.size, total, `${total} programs in ${count} shards: some program is in no shard`);
      for (const [p, ks] of seen) assert.equal(ks.length, 1, `${p.where} is in shards ${ks.map((k) => k + 1).join(", ")}`);
      const sizes = shards.map((s) => s.length);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${total} in ${count}: sizes ${sizes}`);
      for (const s of shards) assert.deepEqual(s, all.filter((p) => s.includes(p)), "a shard keeps the list's order");
    }
  }
});

test("the split is deterministic: the same list and setting give the same programs", () => {
  const a = programs(300);
  const b = programs(300);
  for (const spec of ["1/3", "2/3", "3/3"]) assert.deepEqual(shardOf(a, parseShard(spec)).map((p) => p.where), shardOf(b, parseShard(spec)).map((p) => p.where));
  assert.deepEqual(shardOf(a, parseShard("2/3")).slice(0, 3).map((p) => p.where), [a[1], a[4], a[7]].map((p) => p.where));
});

test("a run of neighbours (a module's slow games) is spread over all the shards", () => {
  const all = programs(90);
  const neighbours = all.slice(40, 46);
  for (let index = 1; index <= 3; index++) {
    const s = shardOf(all, { index, count: 3 });
    assert.equal(neighbours.filter((p) => s.includes(p)).length, 2);
  }
});
