/** Pure tool logic over a docSource; returns markdown bodies (header added by server.js). */

const COMPONENT_MD = /^docs\/components\/([^/]+)\.md$/;
const TOPIC_MD = /^docs\/([^/]+)\.md$/;

/** @param {string} a @param {string} b */
export function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** @param {string[]} names @param {string} query */
const findName = (names, query) => names.find((n) => n.toLowerCase() === query.toLowerCase());

/** @param {string[]} names @param {string} query */
const closest = (names, query) =>
  names
    .map((n) => [n, levenshtein(n.toLowerCase(), query.toLowerCase())])
    .sort((x, y) => /** @type {number} */ (x[1]) - /** @type {number} */ (y[1]))
    .slice(0, 3)
    .map(([n]) => n);

/**
 * Tools bound to one resolved version. `warn` collects docSource warnings.
 * @param {ReturnType<typeof import('./docSource.js').createDocSource>} docSource
 * @param {string} version
 * @param {(w?: string) => void} warn
 */
export function createTools(docSource, version, warn) {
  const read = async (/** @type {string} */ path) => {
    const r = await docSource.readFile(version, path);
    warn(r.warning);
    return r.text;
  };
  const list = async () => {
    const r = await docSource.listFiles(version);
    warn(r.warning);
    return r.files;
  };
  const match = (/** @type {string[]} */ files, /** @type {RegExp} */ re) =>
    files.flatMap((f) => re.exec(f)?.[1] ?? []).sort();

  /** @returns {Promise<{ name: string, summary: string, cluster: string }[] | null>} */
  async function index() {
    const text = await read('docs/components/index.json');
    if (text == null) return null;
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter((c) => typeof c?.name === 'string') : null;
    } catch {
      return null;
    }
  }

  async function componentNames() {
    return (await index())?.map((c) => c.name) ?? match(await list(), COMPONENT_MD);
  }

  return {
    async getPrimer() {
      return (await read('AI-PRIMER.md')) ?? `AI-PRIMER.md not found for ${version}.`;
    },

    async listComponents() {
      const idx = await index();
      if (idx) {
        const str = (/** @type {unknown} */ v) => typeof v === 'string' && v !== '';
        return idx
          .map(
            (c) =>
              `- **${c.name}**${str(c.summary) ? ` — ${c.summary}` : ''}${str(c.cluster) ? ` (${c.cluster})` : ''}`,
          )
          .join('\n');
      }
      const names = match(await list(), COMPONENT_MD);
      return [
        ...names.map((n) => `- **${n}**`),
        '',
        `summaries unavailable for ${version}; upgrade the DS`,
      ].join('\n');
    },

    async getComponentDoc(/** @type {string} */ name) {
      const names = await componentNames();
      const hit = findName(names, name);
      if (!hit) return `No component "${name}". Closest: ${closest(names, name).join(', ')}`;
      return (await read(`docs/components/${hit}.md`)) ?? `docs/components/${hit}.md not found.`;
    },

    async getDoc(/** @type {string} */ topic) {
      if (topic.toLowerCase() === 'readme')
        return (await read('README.md')) ?? 'README.md not found.';
      const topics = match(await list(), TOPIC_MD);
      const hit = findName(topics, topic);
      if (!hit) return `Unknown topic "${topic}". Available: ${topics.join(', ')}`;
      return (await read(`docs/${hit}.md`)) ?? `docs/${hit}.md not found.`;
    },
  };
}
