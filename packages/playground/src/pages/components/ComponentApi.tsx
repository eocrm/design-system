import { Fragment, useState, type ReactNode } from 'react';
import { Badge, Code, Table } from '@eocrm/design-system';
import propsManifest from '../../lib/props.manifest.json';
import styles from './ComponentApi.module.scss';

interface PropEntry {
  name: string;
  type: string;
  required: boolean;
  default: string;
  description: string;
}

const manifest = propsManifest as {
  components: Record<string, { props: PropEntry[] }>;
  types: Record<string, string>;
};

/**
 * Auto-generated "API" reference rendered at the bottom of every component demo.
 * Reads `props.manifest.json` — extracted from each component's `<Name>Props`
 * TypeScript + JSDoc by `scripts/extract-props.mjs` and regenerated on every
 * dev/build — so the table is always in sync with the shipped props. Components
 * with no public props (e.g. imperative APIs like Toast) render nothing.
 *
 * Type aliases in the Type column (e.g. `DividerOrientation`) are clickable: they
 * toggle to their expanded definition (`"horizontal" | "vertical"`) and back.
 */
export function ComponentApi({ name }: { name: string }) {
  // Alias names the reader has expanded; clicking any chip toggles every
  // occurrence of that alias across the table for consistency.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggleType = (alias: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });

  const entry = manifest.components[name];
  if (!entry || entry.props.length === 0) return null;

  return (
    <section className={styles.api} aria-labelledby="component-api-heading">
      <h2 id="component-api-heading" className={styles.title}>
        API
      </h2>
      <p className={styles.subtitle}>
        Props for <Code>{`<${name}>`}</Code>. Generated from the component&rsquo;s TypeScript types
        and JSDoc.
      </p>
      <div className={styles.tableWrap}>
        <Table density="dense">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Prop</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Default</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {entry.props.map((prop) => (
              <Table.Row key={prop.name}>
                <Table.Cell>
                  <span className={styles.propName}>
                    <Code>{prop.name}</Code>
                    {prop.required && (
                      <Badge tone="danger" size="sm">
                        required
                      </Badge>
                    )}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <TypeText type={prop.type} expanded={expanded} onToggle={toggleType} />
                </Table.Cell>
                <Table.Cell>
                  {prop.default ? (
                    <Code tone="muted">{prop.default}</Code>
                  ) : (
                    <span className={styles.dash}>—</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className={styles.description}>{renderRichText(prop.description)}</div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </section>
  );
}

/**
 * Renders a prop's type, turning any public type alias (a key in the manifest's
 * `types` map) into a button that toggles between the alias name and its expanded
 * definition. Non-alias text (primitives, `|`, generics) renders verbatim.
 */
function TypeText({
  type,
  expanded,
  onToggle,
}: {
  type: string;
  expanded: ReadonlySet<string>;
  onToggle: (alias: string) => void;
}) {
  // Split on identifiers so each captured identifier is its own array slot; the
  // separators (spaces, `|`, `<>`, quotes, …) come through as the in-between slots.
  const parts = type.split(/([A-Za-z_$][\w$]*)/g);
  return (
    <Code tone="accent">
      {parts.map((part, i) => {
        const expansion = manifest.types[part];
        if (!expansion) return <Fragment key={i}>{part}</Fragment>;
        const isOpen = expanded.has(part);
        return (
          <button
            key={i}
            type="button"
            className={styles.typeAlias}
            onClick={() => onToggle(part)}
            title={isOpen ? `Collapse ${part}` : `Expand ${part}`}
            aria-expanded={isOpen}
          >
            {isOpen ? expansion : part}
          </button>
        );
      })}
    </Code>
  );
}

/**
 * Tiny markdown-lite renderer for JSDoc prop descriptions: paragraphs, `-`
 * bullet lists, inline `` `code` `` and `**bold**`. Deliberately minimal — it
 * only handles the conventions the library's JSDoc actually uses.
 */
function renderRichText(text: string): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(<p key={`p-${blocks.length}`}>{renderInline(paragraph.join(' '))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className={styles.list}>
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
    } else if (line === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Inline formatting: `` `code` `` → <code>, `**bold**` → <strong>. */
function renderInline(text: string): ReactNode {
  // Split on code spans first (they win over bold), keeping the delimiters.
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={i} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{renderBold(part)}</Fragment>;
  });
}

function renderBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 2 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
