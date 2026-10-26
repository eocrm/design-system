// A `key` after a prop spread makes the JSX automatic runtime fall back to
// createElement, and SWC/Turbopack (Next 16) drops the key (#707).
export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      afterSpread:
        'Put `key` before any `{...spread}`; after it SWC/Turbopack drops the key and React warns "unique key" (#707).',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        let spread = false;
        for (const attr of node.attributes) {
          if (attr.type === 'JSXSpreadAttribute') spread = true;
          else if (spread && attr.name.type === 'JSXIdentifier' && attr.name.name === 'key') {
            context.report({ node: attr, messageId: 'afterSpread' });
          }
        }
      },
    };
  },
};
