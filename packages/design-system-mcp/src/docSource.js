import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import semver from 'semver';
import { fileURLToPath } from 'node:url';

const NAME = '@eocrm/design-system';
const TIMEOUT_MS = 5000;
const SNAPSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'snapshot');
// Same set bundle-snapshot.mjs extracts.
const WANTED = /^(AI-PRIMER\.md|docs\/.*|src\/components\.manifest\.json)$/;

function defaultCacheDir() {
  const base =
    process.env.XDG_CACHE_HOME ||
    (process.platform === 'win32' && process.env.LOCALAPPDATA) ||
    join(homedir(), '.cache');
  return join(base, 'eocrm-design-system-mcp');
}

const validVersion = (/** @type {string} */ v) => typeof v === 'string' && semver.valid(v) === v;
/** No absolute paths, backslashes or `..` segments. */
const validPath = (/** @type {string} */ p) =>
  typeof p === 'string' &&
  p !== '' &&
  !isAbsolute(p) &&
  !p.includes('\\') &&
  !p.split('/').includes('..');
const contains = (/** @type {string} */ root, /** @type {string} */ file) =>
  file.startsWith(resolve(root) + sep);

/** @param {string} p */
const readOrNull = (p) => readFile(p, 'utf8').catch(() => null);

/**
 * @param {{ cacheDir?: string, snapshotDir?: string, fetch?: typeof fetch, offline?: boolean }} [opts]
 */
export function createDocSource({
  cacheDir = defaultCacheDir(),
  snapshotDir = SNAPSHOT_DIR,
  fetch: doFetch = globalThis.fetch,
  offline = false,
} = {}) {
  /** GET with timeout. Returns text, null (404), or throws (network/5xx). */
  async function get(url) {
    const res = await doFetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.text();
  }

  /** Try each url in order. Text on first 200; null only if every url 404'd; throws if none succeeded and any errored. */
  async function firstOf(urls) {
    let err;
    for (const url of urls) {
      try {
        const text = await get(url);
        if (text != null) return text;
      } catch (e) {
        err = e;
      }
    }
    if (err) throw err;
    return null;
  }

  /** @returns {Promise<{ snapVersion: string|null, warning?: string }>} */
  async function snapshotMeta(version) {
    const snapVersion = (await readOrNull(join(snapshotDir, 'VERSION')))?.trim() ?? null;
    if (snapVersion === version) return { snapVersion };
    return {
      snapVersion,
      warning: `using bundled ${snapVersion ?? 'unknown'} docs; requested ${version} unavailable offline`,
    };
  }

  async function fromSnapshot(version, path) {
    const { snapVersion, warning } = await snapshotMeta(version);
    const file = resolve(snapshotDir, path);
    const text = contains(snapshotDir, file) ? await readOrNull(file) : null;
    return { text, servedVersion: snapVersion ?? version, ...(warning && { warning }) };
  }

  return {
    async readFile(version, path) {
      if (!validVersion(version) || !validPath(path)) return { text: null, servedVersion: version };
      if (offline) return fromSnapshot(version, path);

      const cached = resolve(cacheDir, version, path);
      if (!contains(cacheDir, cached)) return { text: null, servedVersion: version };
      const hit = await readOrNull(cached);
      if (hit != null) return { text: hit, servedVersion: version };

      const base = `${NAME}@${version}/${path}`;
      let text;
      try {
        text = await firstOf([`https://cdn.jsdelivr.net/npm/${base}`, `https://unpkg.com/${base}`]);
      } catch {
        return fromSnapshot(version, path);
      }
      if (text == null) return { text: null, servedVersion: version };

      try {
        await mkdir(dirname(cached), { recursive: true });
        const tmp = `${cached}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(tmp, text);
        await rename(tmp, cached);
      } catch {
        // cache is best-effort; still serve the fetched text
      }
      return { text, servedVersion: version };
    },

    async listFiles(version) {
      const fromSnap = async () => {
        const { snapVersion, warning } = await snapshotMeta(version);
        const files = JSON.parse((await readOrNull(join(snapshotDir, 'files.json'))) ?? '[]');
        return { files, servedVersion: snapVersion ?? version, ...(warning && { warning }) };
      };
      if (!validVersion(version)) return { files: [], servedVersion: version };
      if (offline) return fromSnap();
      try {
        const text = await get(
          `https://data.jsdelivr.com/v1/packages/npm/${NAME}@${version}?structure=flat`,
        );
        if (text == null) return fromSnap();
        const files = JSON.parse(text)
          .files.map((f) => f.name.replace(/^\//, ''))
          .filter((n) => WANTED.test(n));
        return { files, servedVersion: version };
      } catch {
        return fromSnap();
      }
    },
  };
}
