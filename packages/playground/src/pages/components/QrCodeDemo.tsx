import { Cluster, Constrain, QrCode, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import logoUrl from '../../assets/eocrm-logo.svg';

const URL_VALUE = 'https://eocrm.example.com/invoice/INV-2026-0042';

// 84 bytes, which at level 'H' is a version-8 symbol — past version 7, where a
// centre alignment pattern first appears under the punch-out. Scan this one.
const LONG_URL_VALUE =
  'https://eocrm.example.com/invite?tenant=acme-industries&token=7f3c9b21e4&ref=qr-demo';

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
    <Constrain maxWidth="sm">
      <QrCode
        value="https://eocrm.example.com/invoice/INV-2026-0042"
        aria-label="QR code for invoice INV-2026-0042"
      />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="sm">
          <QrCode value={URL_VALUE} aria-label="QR code for invoice INV-2026-0042" />
        </Constrain>
      </Example>

      <Example
        title="With a mark"
        description="`logo` is a CSS alpha mask filled with the current ink — this is the unmodified eocrm-logo.svg, recoloured by the mask rather than by a second asset. Toggle the theme or click the code: the mark follows. Setting `logo` raises the default level to 'H'."
        code={`import { Constrain, QrCode } from '@eocrm/design-system';
import logoUrl from './eocrm-logo.svg';

const inviteUrl = 'https://eocrm.example.com/invoice/INV-2026-0042';

export function Demo() {
  return (
    <Constrain maxWidth="sm">
      <QrCode value={inviteUrl} logo={logoUrl} aria-label="Invite link" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="sm">
          <QrCode value={URL_VALUE} logo={logoUrl} aria-label="Invite link" />
        </Constrain>
      </Example>

      <Example
        title="A mark past the alignment-pattern boundary"
        description="The one to scan with a phone. This value is 84 bytes, which at level 'H' is a version-8 symbol — from version 7 up there is a centre alignment pattern, and the punch-out lands on it. Reed–Solomon protects data, not function patterns, so this case rests on decoders extrapolating the grid from the finder and timing patterns rather than on the error-correction budget. If a logo QR ever fails to scan, it fails here first."
        code={`import { Constrain, QrCode } from '@eocrm/design-system';
import logoUrl from './eocrm-logo.svg';

const inviteUrl =
  'https://eocrm.example.com/invite?tenant=acme-industries&token=7f3c9b21e4&ref=qr-demo';

export function Demo() {
  return (
    <Constrain maxWidth="sm">
      <QrCode value={inviteUrl} logo={logoUrl} aria-label="Invite link for Acme Industries" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="sm">
          <QrCode
            value={LONG_URL_VALUE}
            logo={logoUrl}
            aria-label="Invite link for Acme Industries"
          />
        </Constrain>
      </Example>

      <Example
        title="Error-correction levels"
        description="Higher correction survives more damage but needs a larger symbol for the same data. L ~7%, M ~15%, Q ~25%, H ~30%."
        code={`import { Cluster, QrCode, Stack, Text } from '@eocrm/design-system';

const url = 'https://eocrm.example.com/invoice/INV-2026-0042';

export function Demo() {
  return (
    <Cluster gap="lg">
      {(['L', 'M', 'Q', 'H'] as const).map((level) => (
        <Stack key={level} gap="xs" align="center">
          {/* There is no size prop — the parent owns the box. */}
          <div style={{ width: 196 }}>
            <QrCode value={url} level={level} aria-label={\`Level \${level}\`} />
          </div>
          <Text size="sm" tone="muted">
            {level}
          </Text>
        </Stack>
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg">
          {(['L', 'M', 'Q', 'H'] as const).map((level) => (
            <Stack key={level} gap="xs" align="center">
              {/* A plain sized box — four 200px codes will not sit in one row,
                  and this doubles as the demonstration that the parent, not the
                  component, owns the box. */}
              <div style={{ width: 196 }}>
                <QrCode value={URL_VALUE} level={level} aria-label={`Level ${level}`} />
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
        code={`import { Constrain, QrCode } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain maxWidth="sm">
      <QrCode value="Привет, мир! Это тестовая строка." aria-label="Тестовый QR-код" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="sm">
          <QrCode value="Привет, мир! Это тестовая строка." aria-label="Тестовый QR-код" />
        </Constrain>
      </Example>

      <Example
        title="Unencodable value"
        description="An empty value, or one too long for the largest symbol, renders a disabled plate instead of throwing. A long CRM field cannot white-screen the page. The aria-label you passed is prefixed to the message as visible text, so a screen-reader user can tell which code failed."
        code={`import { Constrain, QrCode } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain maxWidth="sm">
      <QrCode value={'x'.repeat(5000)} aria-label="QR code for invoice INV-2026-0042" />
    </Constrain>
  );
}`}
      >
        <Constrain maxWidth="sm">
          <QrCode value={'x'.repeat(5000)} aria-label="QR code for invoice INV-2026-0042" />
        </Constrain>
      </Example>
    </DemoLayout>
  );
}
