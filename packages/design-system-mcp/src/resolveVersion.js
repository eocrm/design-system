import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';

const NAME = '@eocrm/design-system';
const PACKUMENT_URL = 'https://registry.npmjs.org/@eocrm%2fdesign-system';

/** @param {string} p */
const read = (p) => readFile(p, 'utf8').catch(() => null);

/** @param {string} text @param {RegExp} re global regex, group 1 = version */
const highest = (text, re) =>
  [...text.matchAll(re)]
    .map((m) => m[1])
    .filter((v) => semver.valid(v))
    .sort(semver.rcompare)[0];

// Checked in order, first hit wins.
// ponytail: highest wins; per-workspace resolution if a monorepo pins two
/** @type {[string, (text: string) => string | undefined][]} */
const LOCKFILES = [
  [
    'package-lock.json',
    (t) => {
      const pkgs = JSON.parse(t).packages ?? {};
      const key = `node_modules/${NAME}`;
      const vs = Object.entries(pkgs)
        .filter(([k]) => k === key || k.endsWith(`/${key}`))
        .map(([, v]) => v.version)
        .filter((v) => semver.valid(v));
      return vs.sort(semver.rcompare)[0];
    },
  ],
  // v6+: `@eocrm/design-system@0.6.20(peer…)`; v5: `/@eocrm/design-system/0.6.20_peer…`
  ['pnpm-lock.yaml', (t) => highest(t, /@eocrm\/design-system[@/](\d[^:'"\s(_]*)/g)],
  // classic: `version "x"`; berry: `version: x`
  [
    'yarn.lock',
    (t) => highest(t, /^"?@eocrm\/design-system@[^\n]*:\n\s+version:? "?([^"\s]+)"?/gm),
  ],
  ['bun.lock', (t) => highest(t, /"@eocrm\/design-system@(\d[^"]*)"/g)],
];

/**
 * Resolve which @eocrm/design-system version a project uses.
 * @param {string} projectDir
 * @param {{ fetchPackument?: (name: string) => Promise<any> }} [opts]
 * @returns {Promise<{ version: string, source: 'package-lock.json'|'pnpm-lock.yaml'|'yarn.lock'|'bun.lock'|'package.json range'|'latest', note?: string }>}
 */
export async function resolveVersion(projectDir, { fetchPackument = defaultFetch } = {}) {
  for (const [file, parse] of LOCKFILES) {
    const text = await read(join(projectDir, file));
    if (text == null) continue;
    let version;
    try {
      version = parse(text);
    } catch {
      continue; // unparseable lockfile: fall through to the next source
    }
    if (version) return { version, source: /** @type {any} */ (file) };
  }

  const pkgText = await read(join(projectDir, 'package.json'));
  let range;
  try {
    const pkg = JSON.parse(pkgText ?? '{}');
    range = pkg.dependencies?.[NAME] ?? pkg.devDependencies?.[NAME] ?? pkg.peerDependencies?.[NAME];
  } catch {}

  const packument = async () => fetchPackument(NAME);
  if (range) {
    const p = await packument();
    const version = semver.maxSatisfying(Object.keys(p.versions ?? {}), range);
    if (version) return { version, source: 'package.json range' };
    return {
      version: p['dist-tags'].latest,
      source: 'latest',
      note: `range "${range}" matched no published version; using latest`,
    };
  }
  const p = await packument();
  return {
    version: p['dist-tags'].latest,
    source: 'latest',
    note: `no ${NAME} dependency found in ${projectDir}; using latest`,
  };
}

async function defaultFetch() {
  const res = await fetch(PACKUMENT_URL, {
    signal: AbortSignal.timeout(5000), // a timeout rejects; the server falls back to the snapshot
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  });
  if (!res.ok) throw new Error(`npm registry returned ${res.status} for ${NAME}`);
  return res.json();
}
