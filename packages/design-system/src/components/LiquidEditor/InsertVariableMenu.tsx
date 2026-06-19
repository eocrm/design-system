import { DropdownMenu } from '../DropdownMenu';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import type { LiquidVariable } from './types';

export interface InsertVariableMenuProps {
  /** Variables offered in the menu, grouped by `group` in first-seen order. */
  variables: LiquidVariable[];
  /** Disable the trigger (read-only / disabled editor). */
  disabled?: boolean;
  /** Called with the chosen variable's `code` when an item is selected. */
  onInsert: (code: string) => void;
}

/**
 * Toolbar menu that inserts `{{ code }}` at the caret. Groups variables by their
 * `group` field (first-seen order) under section labels; ungrouped variables
 * render without a label. Shows an empty-state label when there are none.
 */
export function InsertVariableMenu({ variables, disabled, onInsert }: InsertVariableMenuProps) {
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
              {group.items.map((v) => (
                <DropdownMenu.Item key={v.code} onSelect={() => onInsert(v.code)}>
                  {v.label ?? v.code}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Group>
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
