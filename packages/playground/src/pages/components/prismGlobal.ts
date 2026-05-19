// Expose prism-react-renderer's internal Prism on globalThis so the
// `prismjs/components/prism-*` side-effect modules can attach grammars to it.
//
// This module exists only for its side effect — it runs at module evaluation
// time, before any importer's body. Its sibling import in prismLangs.ts must
// come FIRST in source order so ES module DFS evaluates it before the
// grammar-registering imports.

import { Prism } from 'prism-react-renderer';

(globalThis as unknown as { Prism: typeof Prism }).Prism = Prism;
