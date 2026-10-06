// Ported from structure.test.ts "an accessible name is never built with ??".
// `??` anywhere inside an aria-label / aria-valuetext expression, nested or not.
const ATTRS = new Set(['aria-label', 'aria-valuetext']);

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      nullish:
        '`??` in an aria-label / aria-valuetext expression lets an empty string through as the accessible name; use `||`.',
    },
  },
  create(context) {
    const keys = context.sourceCode.visitorKeys;
    const walk = (node) => {
      if (node.type === 'LogicalExpression' && node.operator === '??') {
        context.report({ node, messageId: 'nullish' });
      }
      for (const key of keys[node.type] ?? []) {
        const child = node[key];
        for (const c of Array.isArray(child) ? child : [child]) if (c) walk(c);
      }
    };
    return {
      JSXAttribute(node) {
        if (ATTRS.has(node.name.name) && node.value?.type === 'JSXExpressionContainer') {
          walk(node.value.expression);
        }
      },
    };
  },
};
