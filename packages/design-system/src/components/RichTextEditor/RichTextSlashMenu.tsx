// RichTextSlashMenu.tsx — the floating `/` insert listbox. Presentational: the
// editor (via useSlashMenu) owns the state. Options are grouped (role="group"),
// and an empty filter shows a disabled "No matches" option the textbox's
// aria-activedescendant points at, so a screen reader hears it. Not exported.
import { useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { Text } from '../Text';
import { TriggerListbox } from './RichTextMentionMenu';
import type { SlashGroup, SlashItem } from './slashItems';
import type { Rect } from './selection';
import styles from './RichTextEditor.module.scss';

export interface RichTextSlashMenuProps {
  items: SlashItem[];
  activeIndex: number;
  anchorRect: Rect;
  getAnchorRect: () => Rect | null;
  listboxId: string;
  getOptionId: (index: number) => string;
  /** Id of the "No matches" option (the editor points aria-activedescendant at it). */
  emptyOptionId: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

const GROUP_LABEL = {
  text: 'richTextEditor.slashGroupText',
  lists: 'richTextEditor.slashGroupLists',
  media: 'richTextEditor.slashGroupMedia',
  advanced: 'richTextEditor.slashGroupAdvanced',
} as const satisfies Record<SlashGroup, string>;

export function RichTextSlashMenu({
  items,
  activeIndex,
  anchorRect,
  getAnchorRect,
  listboxId,
  getOptionId,
  emptyOptionId,
  onSelect,
  onHover,
}: RichTextSlashMenuProps) {
  const t = useTranslation();
  // Keep the keyboard-active option visible in the scrolling listbox.
  const activeId = items.length ? getOptionId(activeIndex) : null;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  // Items arrive sorted by group (filterSlashItems), so each group is one run.
  const groups: { group: SlashGroup; start: number; items: SlashItem[] }[] = [];
  items.forEach((item, i) => {
    const last = groups[groups.length - 1];
    if (last?.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, start: i, items: [item] });
  });

  return (
    <TriggerListbox
      anchorRect={anchorRect}
      getAnchorRect={getAnchorRect}
      listboxId={listboxId}
      label={t('richTextEditor.slashMenuLabel')}
    >
      {items.length === 0 ? (
        <div
          id={emptyOptionId}
          role="option"
          aria-disabled="true"
          aria-selected="false"
          className={styles.mentionEmpty}
        >
          <Text size="sm" tone="muted">
            {t('richTextEditor.slashNoMatches')}
          </Text>
        </div>
      ) : (
        groups.map(({ group, start, items: groupItems }) => (
          <div key={group} role="group" aria-labelledby={`${listboxId}-${group}`}>
            <div id={`${listboxId}-${group}`} className={styles.slashGroupLabel}>
              <Text size="xs" tone="muted">
                {t(GROUP_LABEL[group])}
              </Text>
            </div>
            {groupItems.map((item, j) => {
              const i = start + j;
              return (
                <div
                  key={item.id}
                  id={getOptionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={i === activeIndex ? styles.mentionOptionActive : styles.mentionOption}
                  // pointerdown (not click) so the editor doesn't lose its selection first
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSelect(i);
                  }}
                  onMouseMove={() => onHover(i)}
                >
                  <span className={styles.slashIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={styles.mentionText}>
                    <Text size="sm">{item.label}</Text>
                    {item.hint ? (
                      <Text size="xs" tone="muted">
                        {item.hint}
                      </Text>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ))
      )}
    </TriggerListbox>
  );
}
