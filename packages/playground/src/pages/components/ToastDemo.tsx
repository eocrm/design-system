import { useState } from 'react';
import { Button, Cluster, Stack, toast } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

export function ToastDemo() {
  const [bursting, setBursting] = useState(false);

  return (
    <DemoLayout
      name="Toast"
      componentName="Toast"
      description="Imperative transient notifications. Singleton `toast` API + one `<ToastViewport>` mounted at app root."
      files={getComponentFiles('Toast')}
    >
      <Example
        title="Tones"
        description="Five tones with sensible icon + accent color defaults. Error toasts use role='alert' (assertive); the others use role='status' (polite)."
        code={`toast.info('Heads up');
toast.success('Saved');
toast.warning('Storage almost full');
toast.error('Request failed');
toast.loading('Uploading…');`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <Button variant="secondary" onClick={() => toast.info('Heads up')}>
              info
            </Button>
            <Button variant="secondary" onClick={() => toast.success('Saved')}>
              success
            </Button>
            <Button variant="secondary" onClick={() => toast.warning('Storage almost full')}>
              warning
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Request failed')}>
              error
            </Button>
            <Button variant="secondary" onClick={() => toast.loading('Uploading…')}>
              loading
            </Button>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="With a description"
        description="Description is a second line, line-clamped to 2 lines."
        code={`toast.success('Saved', {
  description: 'Your changes are now live.',
});`}
      >
        <InputExample width="auto">
          <Button
            variant="secondary"
            onClick={() =>
              toast.success('Saved', {
                description: 'Your changes are now live.',
              })
            }
          >
            Fire with description
          </Button>
        </InputExample>
      </Example>

      <Example
        title="Action (Undo)"
        description="Single primary action. Clicking the button fires onClick AND dismisses the toast."
        code={`toast.success('Item deleted', {
  action: {
    label: 'Undo',
    onClick: () => toast.info('Restored'),
  },
});`}
      >
        <InputExample width="auto">
          <Button
            variant="secondary"
            onClick={() =>
              toast.success('Item deleted', {
                action: {
                  label: 'Undo',
                  onClick: () => toast.info('Restored'),
                },
              })
            }
          >
            Delete (with Undo)
          </Button>
        </InputExample>
      </Example>

      <Example
        title="Programmatic update"
        description="Fire a loading toast, mutate it in place after the async op completes."
        code={`const id = toast.loading('Uploading…');
setTimeout(() => {
  toast.success('Uploaded', { id });
}, 2000);`}
      >
        <InputExample width="auto">
          <Button
            variant="secondary"
            onClick={() => {
              const id = toast.loading('Uploading…');
              setTimeout(() => {
                toast.success('Uploaded', { id });
              }, 2000);
            }}
          >
            Start upload
          </Button>
        </InputExample>
      </Example>

      <Example
        title="toast.promise (async sugar)"
        description="Pass a promise; the toast cycles loading → success/error automatically. Returns the original promise."
        code={`toast.promise(
  new Promise((resolve, reject) =>
    setTimeout(() => (Math.random() > 0.5 ? resolve('done') : reject(new Error('500'))), 1500)
  ),
  {
    loading: 'Working…',
    success: 'Worked',
    error: (e) => \`Failed: \${(e as Error).message}\`,
  }
);`}
      >
        <InputExample width="auto">
          <Button
            variant="secondary"
            onClick={() =>
              toast.promise(
                new Promise((resolve, reject) =>
                  setTimeout(
                    () => (Math.random() > 0.5 ? resolve('done') : reject(new Error('500'))),
                    1500,
                  ),
                ),
                {
                  loading: 'Working…',
                  success: 'Worked',
                  error: (e) => `Failed: ${(e as Error).message}`,
                },
              )
            }
          >
            Fire promise toast
          </Button>
        </InputExample>
      </Example>

      <Example
        title="Persistent error"
        description="duration: 'persistent' disables auto-dismiss. The close (×) button is force-enabled even if you pass dismissible: false."
        code={`toast.error('Connection lost', { duration: 'persistent' });`}
      >
        <InputExample width="auto">
          <Button
            variant="secondary"
            onClick={() => toast.error('Connection lost', { duration: 'persistent' })}
          >
            Fire persistent error
          </Button>
        </InputExample>
      </Example>

      <Example
        title="Per-call position override"
        description="A per-call `position` routes that toast into a different bucket. Use sparingly — mixing positions in one app is unusual UX."
        code={`toast.info('top-right', { position: 'top-right' });
toast.info('top-center', { position: 'top-center' });
toast.info('bottom-left', { position: 'bottom-left' });
toast.info('bottom-center', { position: 'bottom-center' });`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <Button
              variant="secondary"
              onClick={() => toast.info('top-right', { position: 'top-right' })}
            >
              top-right
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info('top-center', { position: 'top-center' })}
            >
              top-center
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info('bottom-left', { position: 'bottom-left' })}
            >
              bottom-left
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info('bottom-center', { position: 'bottom-center' })}
            >
              bottom-center
            </Button>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Burst + hover to expand"
        description="Fires 7 toasts in rapid succession. Only the top 3 are visible; the rest peek-collapse. Hover the stack to fan them out."
        code={`for (let i = 1; i <= 7; i++) {
  setTimeout(() => toast.info(\`Message #\${i}\`), i * 60);
}`}
      >
        <InputExample width="auto">
          <Stack gap="sm">
            <Button
              variant="secondary"
              disabled={bursting}
              onClick={() => {
                setBursting(true);
                for (let i = 1; i <= 7; i++) {
                  setTimeout(() => toast.info(`Message #${i}`), i * 60);
                }
                setTimeout(() => setBursting(false), 600);
              }}
            >
              Fire 7 toasts
            </Button>
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
