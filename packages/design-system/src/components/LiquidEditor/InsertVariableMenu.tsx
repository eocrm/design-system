import { DropdownMenu } from '../DropdownMenu';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import type { LiquidVariable } from './types';
import {
  buildVariableTree,
  collapseChains,
  dropSharedRoot,
  type VariableNode,
} from './variableTree';
import styles from './LiquidEditor.module.scss';

export interface InsertVariableMenuProps {
  /** Variables offered in the menu, grouped by `group` in first-seen order. */
  variables: LiquidVariable[];
  /** Disable the trigger (read-only / disabled editor). */
  disabled?: boolean;
  /** Called with the chosen variable when an item is selected. */
  onInsert: (variable: LiquidVariable) => void;
  /** Sub-menu labels for undeclared intermediate paths (see `LiquidEditorProps.variablePathLabels`). */
  pathLabels?: Record<string, string>;
}

/**
 * Toolbar menu that inserts `{{ code }}` at the caret — or, for a collection
 * variable (`collection: true`), a `{% for item in code %}{{ item }}{% endfor %}`
 * snippet with the caret left after `{{ item }}`. Groups variables by their
 * `group` field (first-seen order) under section labels; ungrouped variables
 * render without a label. A named group whose variables share one undeclared
 * root (e.g. all `record.*`) lists that root's children directly under its
 * label. Shows an empty-state label when there are none.
 */
export function InsertVariableMenu({
  variables,
  disabled,
  onInsert,
  pathLabels,
}: InsertVariableMenuProps) {
  const t = useTranslation();

  // Preserve first-seen group order.
  const groups: { name: string | undefined; items: LiquidVariable[] }[] = [];
  for (const v of variables) {
    let g = groups.find((x) => x.name === v.group);
    if (!g) {
      g = { name: v.group, items: [] };
      groups.push(g);
    }
    g.items.push(v);
  }

  const renderVariable = (v: LiquidVariable) => (
    <VariableItem
      key={v.code}
      variable={v}
      tags={[v.collection ? t('liquidEditor.collectionTag') : null, v.type]
        .filter(Boolean)
        .join(' · ')}
      onInsert={onInsert}
    />
  );

  // Single-child chains are merged first (collapseChains). Nodes with children
  // become sub-menus (a declared parent is the first item inside its own
  // sub-menu, and its label names the sub-menu); childless nodes are plain items.
  const renderNode = (node: VariableNode) =>
    node.children.length === 0 ? (
      node.variable && renderVariable(node.variable)
    ) : (
      <DropdownMenu.Sub key={node.path}>
        <DropdownMenu.SubTrigger>
          {node.variable?.label || pathLabels?.[node.path] || node.segment}
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          {node.variable && renderVariable(node.variable)}
          {node.children.map((child) => renderNode(child))}
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    );

  return (
    <DropdownMenu>
      {/* Trigger clones its single child to inject ref + ARIA — no `asChild`. */}
      <DropdownMenu.Trigger>
        <Button variant="secondary" size="sm" disabled={disabled || variables.length === 0}>
          {t('liquidEditor.insertVariable')}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {variables.length === 0 ? (
          <DropdownMenu.Label>{t('liquidEditor.noVariables')}</DropdownMenu.Label>
        ) : (
          groups.map((group, gi) => (
            <DropdownMenu.Group key={group.name ?? `g${gi}`}>
              {group.name ? <DropdownMenu.Label>{group.name}</DropdownMenu.Label> : null}
              {/* Named groups drop a shared root hop — the label already names it. */}
              {(group.name ? dropSharedRoot : (n: readonly VariableNode[]) => n)(
                collapseChains(buildVariableTree(group.items)),
              ).map((node) => renderNode(node))}
            </DropdownMenu.Group>
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

interface VariableItemProps {
  variable: LiquidVariable;
  /** Pre-joined collection/type tags shown as the item's shortcut. */
  tags: string;
  onInsert: (variable: LiquidVariable) => void;
}

/** One selectable variable row: label, optional muted description, tags. */
function VariableItem({ variable: v, tags, onInsert }: VariableItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={() => onInsert(v)}
      shortcut={tags || undefined}
      textValue={v.label || v.code}
    >
      <span className={styles.menuItemMain}>
        {/* `||`, not `??`: `code` is here so a menu item always has SOMETHING
            readable, and this span is the item's only name source — `label: ''`
            would defeat it and render a blank menuitem (#535). */}
        <span>{v.label || v.code}</span>
        {v.description ? <span className={styles.menuItemDesc}>{v.description}</span> : null}
      </span>
    </DropdownMenu.Item>
  );
}
