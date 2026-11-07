import { DropdownMenu } from '../DropdownMenu';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import type { LiquidTagSnippet } from './liquidTags';
import styles from './LiquidEditor.module.scss';

export interface InsertTagMenuProps {
  /** Snippets offered in the menu, in order. */
  snippets: LiquidTagSnippet[];
  /** Disable the trigger (read-only / disabled editor). */
  disabled?: boolean;
  /** Called with the chosen snippet when an item is selected. */
  onInsert: (snippet: LiquidTagSnippet) => void;
}

/**
 * Toolbar menu that inserts a Liquid tag snippet (`{% if %}…{% endif %}` etc.)
 * at the caret, wrapping any selected text. Each item shows the tag label and
 * a muted one-line description.
 */
export function InsertTagMenu({ snippets, disabled, onInsert }: InsertTagMenuProps) {
  const t = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button variant="secondary" size="sm" disabled={disabled}>
          {t('liquidEditor.insertTag')}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {snippets.map((s) => (
          <DropdownMenu.Item key={s.id} onSelect={() => onInsert(s)} textValue={s.label}>
            <span className={styles.menuItemMain}>
              <span>{s.label}</span>{' '}
              <span className={styles.menuItemDesc}>
                {t(`liquidEditor.tagDescription.${s.id}`)}
              </span>
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
