// Ported from structure.test.ts "transient state does not rely on aria-busy
// alone". A file that sets aria-busy needs a live region OR a visually-hidden
// span whose children call t().
// Known limits (as before): `aria-live={expr}` does not count; `t` is assumed
// to be the translation hook's binding.
const attr = (el, name) =>
  el.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
const str = (a) => {
  const v = a?.value;
  if (v?.type === 'Literal') return v.value;
  if (v?.type === 'JSXExpressionContainer' && v.expression.type === 'Literal')
    return v.expression.value;
  return undefined;
};
const HIDDEN = new Set(['srOnly', 'hiddenLabel']);

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      missing:
        'aria-busy is set but nothing announces the state: add a live region (role="status"/"alert" or aria-live="polite"/"assertive") or a visually-hidden span containing a translated state word (t(…)). aria-busy alone is not announced.',
    },
  },
  create(context) {
    const keys = context.sourceCode.visitorKeys;
    let firstBusy = null;
    let announced = false;

    const hasT = (node) => {
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 't'
      )
        return true;
      return (keys[node.type] ?? []).some((key) => {
        const child = node[key];
        return (Array.isArray(child) ? child : [child]).some((c) => c && hasT(c));
      });
    };
    const isHiddenSpan = (el) => {
      const open = el.openingElement;
      if (open.name.type === 'JSXIdentifier' && open.name.name === 'VisuallyHidden') return true;
      const e = attr(open, 'className')?.value?.expression;
      return (
        e?.type === 'MemberExpression' &&
        e.object.type === 'Identifier' &&
        e.object.name === 'styles' &&
        !e.computed &&
        HIDDEN.has(e.property.name)
      );
    };

    return {
      JSXAttribute(node) {
        if (node.name.name === 'aria-busy') firstBusy ??= node;
      },
      JSXOpeningElement(node) {
        const live = str(attr(node, 'aria-live'));
        if (live === 'off') return;
        const role = str(attr(node, 'role'));
        if (role === 'status' || role === 'alert' || live === 'polite' || live === 'assertive')
          announced = true;
      },
      JSXElement(node) {
        if (isHiddenSpan(node) && node.children.some(hasT)) announced = true;
      },
      'Program:exit'() {
        if (firstBusy && !announced) context.report({ node: firstBusy, messageId: 'missing' });
      },
    };
  },
};
