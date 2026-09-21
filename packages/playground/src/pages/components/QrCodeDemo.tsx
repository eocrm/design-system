import { Cluster, Constrain, QrCode, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import logoUrl from '../../assets/eocrm-logo.svg';

const URL_VALUE = 'https://eocrm.example.com/invoice/INV-2026-0042';

export function QrCodeDemo() {
  return (
    <DemoLayout
      name="QrCode"
      componentName="QrCode"
      description="Scannable QR code — encodes any string as UTF-8, optionally masks a single-colour mark into its centre, and swaps ink for paper when clicked. Follows the theme; the click is there for scanners that refuse an inverted symbol."
      files={getComponentFiles('QrCode')}
    >
      <Example
        title="Default"
        description="No size prop — the code fills its container, so the parent owns the box. Click it to swap ink and paper."
        code={`import { Constrain, QrCode } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain maxWidth="xs">
      <QrCode value="https://eocrm.example.com/invoice/INV-2026-0042" label="QR code for invoice INV-2026-0042" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="xs">
          <QrCode value={URL_VALUE} label="QR code for invoice INV-2026-0042" />
        </Constrain>
      </Example>

      <Example
        title="With a mark"
        description="`logo` is a CSS alpha mask filled with the current ink — this is the unmodified eocrm-logo.svg, recoloured by the mask rather than by a second asset. Toggle the theme or click the code: the mark follows. Setting `logo` raises the default level to 'H'."
        code={`import { Constrain, QrCode } from '@eocrm/design-system';
import logoUrl from './eocrm-logo.svg';

export function Demo() {
  return (
    <Constrain maxWidth="xs">
      <QrCode value={inviteUrl} logo={logoUrl} label="Invite link" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="xs">
          <QrCode value={URL_VALUE} logo={logoUrl} label="Invite link" />
        </Constrain>
      </Example>

      <Example
        title="Error-correction levels"
        description="Higher correction survives more damage but needs a larger symbol for the same data. L ~7%, M ~15%, Q ~25%, H ~30%."
        code={`<QrCode value={url} level="L" />
<QrCode value={url} level="M" />
<QrCode value={url} level="Q" />
<QrCode value={url} level="H" />`}
      >
        <Cluster gap="lg">
          {(['L', 'M', 'Q', 'H'] as const).map((level) => (
            <Stack key={level} gap="xs" align="center">
              {/* A plain sized box — four 200px codes will not sit in one row,
                  and this doubles as the demonstration that the parent, not the
                  component, owns the box. */}
              <div style={{ width: 120 }}>
                <QrCode value={URL_VALUE} level={level} label={`Level ${level}`} />
              </div>
              <Text size="sm" tone="muted">
                {level}
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Non-Latin data"
        description="The value is encoded as UTF-8, not latin1 — Cyrillic, Greek and CJK all round-trip."
        code={`<QrCode value="Привет, мир! Это тестовая строка." label="Тестовый QR-код" />`}
      >
        <Constrain maxWidth="xs">
          <QrCode value="Привет, мир! Это тестовая строка." label="Тестовый QR-код" />
        </Constrain>
      </Example>

      <Example
        title="Unencodable value"
        description="An empty value, or one too long for the largest symbol, renders a plate instead of throwing. A long CRM field cannot white-screen the page."
        code={`<QrCode value={'x'.repeat(5000)} />`}
      >
        <Constrain maxWidth="xs">
          <QrCode value={'x'.repeat(5000)} />
        </Constrain>
      </Example>
    </DemoLayout>
  );
}
