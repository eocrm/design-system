const raw = import.meta.glob('@lib-source/components/**/*.{tsx,ts,scss,css}', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface ComponentFile {
  filename: string;
  code: string;
  language: 'tsx' | 'ts' | 'scss' | 'css';
}

const EXT_ORDER: Record<string, number> = {
  tsx: 0,
  scss: 1,
  css: 1,
  ts: 2,
};

function priority(name: string, component: string): [number, number, string] {
  const ext = name.split('.').pop() ?? '';
  const extRank = EXT_ORDER[ext] ?? 9;

  // Within each extension family, the canonical files for the component
  // come first.
  let nameRank = 99;
  if (name === `${component}.tsx`) nameRank = 0;
  else if (ext === 'tsx') nameRank = 1;
  else if (name === `${component}.module.scss`) nameRank = 0;
  else if (name === `${component}.tokens.scss`) nameRank = 1;
  else if (ext === 'scss' || ext === 'css') nameRank = 2;
  else if (name === 'index.ts') nameRank = 99;
  else if (ext === 'ts') nameRank = 50;

  return [extRank, nameRank, name];
}

export function getComponentFiles(name: string): ComponentFile[] {
  const dirMarker = `/components/${name}/`;

  return Object.entries(raw)
    .filter(([path]) => path.includes(dirMarker))
    .filter(([path]) => {
      const after = path.slice(path.indexOf(dirMarker) + dirMarker.length);
      // Only files directly under the component dir, not nested children
      // (none today, but safer).
      if (after.includes('/')) return false;
      return !after.includes('.test.');
    })
    .map(([path, code]) => {
      const filename = path.slice(path.indexOf(dirMarker) + dirMarker.length);
      const ext = filename.split('.').pop() as ComponentFile['language'];
      return { filename, code, language: ext };
    })
    .sort((a, b) => {
      const pa = priority(a.filename, name);
      const pb = priority(b.filename, name);
      if (pa[0] !== pb[0]) return pa[0] - pb[0];
      if (pa[1] !== pb[1]) return pa[1] - pb[1];
      return pa[2].localeCompare(pb[2]);
    });
}
