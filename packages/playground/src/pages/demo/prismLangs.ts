// Import order matters: prismGlobal MUST be first so globalThis.Prism is set
// before the side-effect grammar modules try to attach to it.

import './prismGlobal';

// Side-effect imports — each attaches a language to globalThis.Prism.languages.
import 'prismjs/components/prism-scss';
