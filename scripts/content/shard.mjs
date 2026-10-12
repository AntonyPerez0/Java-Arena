// Splits the content replay (scripts/content-browser.mjs) into shards that CI runs side by side.
// CONTENT_SHARD=k/n keeps the k-th of n shards (k from 1 to n). The split is by program: the
// programs are dealt out in their order in fidelity/out/content-checks.json, the first to shard 1,
// the second to shard 2 and so on, so each program is in exactly one shard, the shards differ in
// size by at most one program, and the slow ones (a module's games and windows come together in
// the list) are spread over all the shards instead of landing in one. The same list and the same
// k/n always give the same programs.

/**
 * Reads a shard setting such as "2/4". Returns { index, count } (index from 1), or null when
 * `spec` is empty or missing (no sharding). Throws on anything else, so a typo in CI fails loudly
 * instead of quietly replaying everything or nothing.
 */
export function parseShard(spec) {
  if (spec == null || String(spec).trim() === "") return null;
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(spec));
  if (!m) throw new Error(`CONTENT_SHARD should look like 2/4 (the 2nd of 4 shards), not "${spec}"`);
  const index = Number(m[1]);
  const count = Number(m[2]);
  if (count < 1 || index < 1 || index > count) throw new Error(`CONTENT_SHARD ${spec}: the shard should be from 1 to ${count < 1 ? "the count (at least 1)" : count}`);
  return { index, count };
}

/** The items of `list` in shard `shard` ({ index, count }, or null: all of them), in their order. */
export function shardOf(list, shard) {
  if (!shard) return list;
  return list.filter((_, i) => i % shard.count === shard.index - 1);
}
