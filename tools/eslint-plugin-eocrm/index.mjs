import noNullishAccessibleName from './rules/no-nullish-accessible-name.mjs';
import noNullishTranslationFallback from './rules/no-nullish-translation-fallback.mjs';
import ariaBusyNeedsAnnouncement from './rules/aria-busy-needs-announcement.mjs';

export default {
  meta: { name: 'eslint-plugin-eocrm' },
  rules: {
    'no-nullish-accessible-name': noNullishAccessibleName,
    'no-nullish-translation-fallback': noNullishTranslationFallback,
    'aria-busy-needs-announcement': ariaBusyNeedsAnnouncement,
  },
};
