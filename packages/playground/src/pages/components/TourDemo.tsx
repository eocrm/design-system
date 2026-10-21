import { useState } from 'react';
import {
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Input,
  Stack,
  Text,
  Tour,
  type TourStep,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const ONBOARDING: TourStep[] = [
  { title: 'Welcome to Deals', body: 'A 30-second look at the essentials.' },
  { target: 'demo-search', title: 'Search', body: 'Find any deal by name or company.' },
  {
    target: 'demo-filter',
    title: 'Filter',
    body: 'Narrow the pipeline by stage or owner.',
    side: 'right',
  },
  { target: 'demo-new', title: 'Create', body: 'Start a new deal from here.', side: 'left' },
  { title: "You're all set", body: 'Replay this tour any time from Help.' },
];

function Toolbar() {
  return (
    <Cluster gap="sm">
      <Input data-tour="demo-search" placeholder="Search deals" aria-label="Search deals" />
      <Button variant="secondary" data-tour="demo-filter">
        Filter
      </Button>
      <Button data-tour="demo-new">New deal</Button>
    </Cluster>
  );
}

export function TourDemo() {
  const [onboarding, setOnboarding] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [menuTour, setMenuTour] = useState(false);
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossStep, setCrossStep] = useState(0);
  const [page, setPage] = useState<'list' | 'detail'>('list');
  const [detailReady, setDetailReady] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);

  const goToDetail = () => {
    setPage('detail');
    setDetailReady(false);
    // Simulated route change + data fetch: the target mounts 800ms later.
    setTimeout(() => setDetailReady(true), 800);
  };

  return (
    <DemoLayout
      name="Tour"
      componentName="Tour"
      description="Guided walkthrough: spotlights data-tour targets step by step, waits for targets across route changes."
      files={getComponentFiles('Tour')}
    >
      <Example
        title="Onboarding (modal)"
        description="Dims the page, spotlights each target and traps focus. Centered welcome and finish steps have no target."
        code={`<Input data-tour="demo-search" … />
<Button data-tour="demo-filter">Filter</Button>

<Tour
  open={open}
  onOpenChange={setOpen}
  onFinish={(reason) => markSeen('deals', reason)}
  steps={[
    { title: 'Welcome to Deals', body: 'A 30-second look at the essentials.' },
    { target: 'demo-search', title: 'Search', body: 'Find any deal by name or company.' },
    { target: 'demo-filter', title: 'Filter', body: '…', side: 'right' },
    { target: 'demo-new', title: 'Create', body: '…', side: 'left' },
    { title: "You're all set", body: 'Replay this tour any time from Help.' },
  ]}
/>`}
      >
        <Stack gap="md">
          <Toolbar />
          <Cluster gap="sm">
            <Button onClick={() => setOnboarding(true)}>Start tour</Button>
            {finished && <Text tone="muted">Last tour ended: {finished}</Text>}
          </Cluster>
        </Stack>
        <Tour
          steps={ONBOARDING}
          open={onboarding}
          onOpenChange={setOnboarding}
          onFinish={setFinished}
        />
      </Example>

      <Example
        title="Feature announcement (modal={false})"
        description="One step, no scrim; the page stays usable."
        code={`<Tour
  open={open}
  onOpenChange={setOpen}
  modal={false}
  doneLabel="Got it"
  steps={[{ target: 'demo-bulk', title: 'New: bulk edit', body: 'Select rows, then edit them together.' }]}
/>`}
      >
        <Cluster gap="sm">
          <Button variant="secondary" data-tour="demo-bulk">
            Bulk edit
          </Button>
          <Button onClick={() => setAnnounce(true)}>Show announcement</Button>
        </Cluster>
        <Tour
          open={announce}
          onOpenChange={setAnnounce}
          modal={false}
          doneLabel="Got it"
          steps={[
            {
              target: 'demo-bulk',
              title: 'New: bulk edit',
              body: 'Select rows, then edit them together.',
            },
          ]}
        />
      </Example>

      <Example
        title="Click to continue (interactive + advanceOn)"
        description="The target stays clickable through the spotlight; clicking it advances the tour."
        code={`steps={[
  { target: 'demo-try', title: 'Try it', body: 'Click “Add note” to continue.', interactive: true, advanceOn: 'click' },
  { title: 'Nice!', body: 'That is all there is to it.' },
]}`}
      >
        <Cluster gap="sm">
          <Button variant="secondary" data-tour="demo-try">
            Add note
          </Button>
          <Button onClick={() => setInteractive(true)}>Start</Button>
        </Cluster>
        <Tour
          open={interactive}
          onOpenChange={setInteractive}
          steps={[
            {
              target: 'demo-try',
              title: 'Try it',
              body: 'Click “Add note” to continue.',
              interactive: true,
              advanceOn: 'click',
            },
            { title: 'Nice!', body: 'That is all there is to it.' },
          ]}
        />
      </Example>

      <Example
        title="Menu walkthrough (pointing into an open menu)"
        description="Click the trigger, then the tour points at the open menu and one of its items. The menu stays open and only the target is lit."
        code={`steps={[
  { target: 'demo-menu', title: 'Open the menu', body: 'Click “Actions”.', interactive: true, advanceOn: 'click' },
  { target: 'demo-menu-content', title: 'Your actions', body: 'Everything you can do with a deal.' },
  { target: 'demo-menu-item', title: 'Duplicate', body: 'Click “Duplicate” to finish.', interactive: true, advanceOn: 'click' },
]}`}
      >
        <Cluster gap="sm">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary" data-tour="demo-menu">
                Actions
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content data-tour="demo-menu-content">
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item data-tour="demo-menu-item" onSelect={() => {}}>
                Duplicate
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
          <Button onClick={() => setMenuTour(true)}>Start</Button>
        </Cluster>
        <Tour
          open={menuTour}
          onOpenChange={setMenuTour}
          steps={[
            {
              target: 'demo-menu',
              title: 'Open the menu',
              body: 'Click “Actions”.',
              interactive: true,
              advanceOn: 'click',
            },
            {
              target: 'demo-menu-content',
              title: 'Your actions',
              body: 'Everything you can do with a deal.',
            },
            {
              target: 'demo-menu-item',
              title: 'Duplicate',
              body: 'Click “Duplicate” to finish.',
              interactive: true,
              advanceOn: 'click',
            },
          ]}
        />
      </Example>

      <Example
        title="Cross-page (controlled step, waiting for a target)"
        description={`Step 2 navigates; its target mounts 800ms later. The card waits, announcing "Loading step…", then glides to it.`}
        code={`<Tour
  open={open}
  onOpenChange={setOpen}
  step={step}
  onStepChange={(i) => {
    // Symmetric on i, not a one-shot "if (i === 1)": Back past step 2 must
    // navigate away from the detail page too, or the Tour waits on the wrong page.
    navigate(i >= 1 ? '/deals/42' : '/deals'); // target mounts after the fetch
    setStep(i);
  }}
  steps={[
    { target: 'demo-row', title: 'Open a deal', body: 'Every deal has a detail page.' },
    { target: 'demo-activity', title: 'Activity', body: 'Calls, emails and notes live here.' },
  ]}
/>`}
      >
        <Card>
          <Stack gap="sm">
            {page === 'list' ? (
              <Button variant="secondary" data-tour="demo-row">
                Acme renewal — $12,000
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setPage('list')}>
                  ← Back to list
                </Button>
                {detailReady ? (
                  <Text data-tour="demo-activity">Activity: 3 calls, 5 emails</Text>
                ) : (
                  <Text tone="muted">Loading deal…</Text>
                )}
              </>
            )}
            <Button
              onClick={() => {
                setPage('list');
                setCrossStep(0);
                setCrossOpen(true);
              }}
            >
              Start cross-page tour
            </Button>
          </Stack>
        </Card>
        <Tour
          open={crossOpen}
          onOpenChange={setCrossOpen}
          step={crossStep}
          onStepChange={(i) => {
            if (i === 1) goToDetail();
            if (i === 0) setPage('list');
            setCrossStep(i);
          }}
          steps={[
            { target: 'demo-row', title: 'Open a deal', body: 'Every deal has a detail page.' },
            {
              target: 'demo-activity',
              title: 'Activity',
              body: 'Calls, emails and notes live here.',
            },
          ]}
        />
      </Example>
    </DemoLayout>
  );
}
