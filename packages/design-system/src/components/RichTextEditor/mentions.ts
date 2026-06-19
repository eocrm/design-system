// mentions.ts — public types for the RichTextEditor `mentions` prop.

/** One mentionable candidate returned by `MentionsConfig.onQuery`. */
export interface MentionItem {
  /** Stable id stored on the mention mark and emitted in serialization (`data-mention-id`). */
  id: string;
  /** Display text — becomes the chip's visible text (without the trigger). */
  label: string;
  /** Optional secondary line in the menu row (e.g. an email). Menu-only; not stored. */
  description?: string;
  /** Optional avatar shown in the menu row. Menu-only; not stored. */
  avatarUrl?: string;
}

/**
 * Enables `@`-mention autocomplete on `<RichTextEditor>`. Omit the `mentions`
 * prop to disable mentions entirely.
 */
export interface MentionsConfig {
  /**
   * Resolve candidates for the text typed after the trigger. Called as the user
   * types; may be sync or async. The editor drops stale async resolutions, so a
   * slow promise that resolves after the query moved on is ignored.
   */
  onQuery: (query: string) => MentionItem[] | Promise<MentionItem[]>;
  /** Single trigger character that opens the menu. Default `'@'`. Multi-character triggers are not supported. */
  trigger?: string;
}
