// fieldContainer.ts — marks DS layout/container components that spread unknown
// props onto a DOM node, so <Field>/<SettingRow> never clone the DS control
// props `invalid` / `required` into them (DS-95). A marker instead of importing
// the containers into fieldWiring keeps their JS + CSS out of Field's bundle.

const FIELD_CONTAINER = Symbol.for('eocrm.ds.fieldContainer');

/**
 * Tag a container component with a statement right after its declaration:
 * `fieldContainer(Stack);`. Tree-shaking still drops an unused container,
 * because the package marks only stylesheets as side-effectful. Every DS
 * component that spreads unknown props onto a DOM node and has no `invalid`
 * prop of its own should be tagged, and listed in fieldWiring.test.tsx.
 */
export function fieldContainer<T extends object>(component: T): T {
  (component as Record<symbol, unknown>)[FIELD_CONTAINER] = true;
  return component;
}

/** Whether an element type was tagged with `fieldContainer`. */
export function isFieldContainer(type: unknown): boolean {
  return (
    (typeof type === 'object' || typeof type === 'function') &&
    type !== null &&
    (type as Record<symbol, unknown>)[FIELD_CONTAINER] === true
  );
}
