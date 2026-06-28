import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CursorPagination, Cluster, Pagination, Select, Stack, Tabs } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import styles from './DemoLayout.module.scss';
import { getComponentFiles } from '../../lib/componentFiles';

type Variant = 'pagination' | 'cursor-pagination';

const VARIANTS: Variant[] = ['pagination', 'cursor-pagination'];

function isVariant(v: string | null): v is Variant {
  return v !== null && (VARIANTS as string[]).includes(v);
}

function PaginationDemoPanel() {
  const [page, setPage] = useState(1);
  const [pageMid, setPageMid] = useState(5);
  const [pageTight, setPageTight] = useState(5);
  const [pageWide, setPageWide] = useState(5);
  const [pageWithSize, setPageWithSize] = useState(1);
  // Select values are strings (see SelectProps in the library), so the
  // page-size state is stored as a string and parsed when used.
  const [pageSize, setPageSize] = useState('10');
  const pageSizeNum = Number(pageSize);

  return (
    <DemoBody files={getComponentFiles('Pagination')} componentName="Pagination">
      <Example
        title="Basic"
        description="Default md size. Click prev / next / a page number to update."
        code={`import { useState } from 'react';
import { Pagination } from '@eocrm/design-system';

export function Demo() {
  const [page, setPage] = useState(1);

  return (
    <Pagination currentPage={page} pageCount={10} onPageChange={setPage} />
  );
}`}
      >
        <Pagination currentPage={page} pageCount={10} onPageChange={setPage} />
      </Example>

      <Example
        title="Middle of a long list"
        description="With pageCount=20 and current=5, both ellipses appear. Total slot count stays at 7."
        code={`import { useState } from 'react';
import { Pagination } from '@eocrm/design-system';

export function Demo() {
  const [page, setPage] = useState(5);

  return (
    <Pagination currentPage={page} pageCount={20} onPageChange={setPage} />
  );
}`}
      >
        <Pagination currentPage={pageMid} pageCount={20} onPageChange={setPageMid} />
      </Example>

      <Example
        title="Single page"
        description="Edge case — pageCount=1 still renders (single disabled-current button + both prev/next disabled). Consumer doesn't have to conditionally hide it."
        code={`import { Pagination } from '@eocrm/design-system';

export function Demo() {
  return (
    <Pagination currentPage={1} pageCount={1} onPageChange={() => {}} />
  );
}`}
      >
        <Pagination currentPage={1} pageCount={1} onPageChange={() => {}} />
      </Example>

      <Example
        title="siblingCount=0 (tight)"
        description="For sidebar / narrow column use. Hides the sibling pages — just first, current, last + ellipses."
        code={`import { useState } from 'react';
import { Pagination } from '@eocrm/design-system';

export function Demo() {
  const [page, setPage] = useState(5);

  return (
    <Pagination
      currentPage={page}
      pageCount={100}
      onPageChange={setPage}
      siblingCount={0}
    />
  );
}`}
      >
        <Pagination
          currentPage={pageTight}
          pageCount={100}
          onPageChange={setPageTight}
          siblingCount={0}
        />
      </Example>

      <Example
        title="siblingCount=2 (wide)"
        description="For full-width footers. Two sibling pages on each side of current — totalSlots = 9."
        code={`import { useState } from 'react';
import { Pagination } from '@eocrm/design-system';

export function Demo() {
  const [page, setPage] = useState(5);

  return (
    <Pagination
      currentPage={page}
      pageCount={20}
      onPageChange={setPage}
      siblingCount={2}
    />
  );
}`}
      >
        <Pagination
          currentPage={pageWide}
          pageCount={20}
          onPageChange={setPageWide}
          siblingCount={2}
        />
      </Example>

      <Example
        title="Sizes — sm / md / lg"
        description="sm for tight footers and sidebars, md (default) for DataTable, lg for hero / standalone."
        code={`import { Pagination, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Pagination size="sm" currentPage={3} pageCount={10} onPageChange={() => {}} />
      <Pagination size="md" currentPage={3} pageCount={10} onPageChange={() => {}} />
      <Pagination size="lg" currentPage={3} pageCount={10} onPageChange={() => {}} />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Pagination size="sm" currentPage={3} pageCount={10} onPageChange={() => {}} />
          <Pagination size="md" currentPage={3} pageCount={10} onPageChange={() => {}} />
          <Pagination size="lg" currentPage={3} pageCount={10} onPageChange={() => {}} />
        </Stack>
      </Example>

      <Example
        title="Disabled (loading lock)"
        description="Lock the whole nav while data is refetching to prevent double-clicks."
        code={`import { Pagination } from '@eocrm/design-system';

export function Demo() {
  return (
    <Pagination currentPage={3} pageCount={10} onPageChange={() => {}} disabled />
  );
}`}
      >
        <Pagination currentPage={3} pageCount={10} onPageChange={() => {}} disabled />
      </Example>

      <Example
        title="Composed with <Select> for page size"
        description="The canonical DataTable footer shape — page-size selector on one side, pagination on the other. Pagination doesn't ship a page-size selector itself; the consumer composes it."
        code={`import { useState } from 'react';
import { Cluster, Pagination, Select } from '@eocrm/design-system';

export function Demo() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const pageSizeNum = Number(pageSize);

  return (
    <Cluster justify="between" align="center" wrap>
      <Cluster gap="sm" align="center">
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Rows per page
        </span>
        <Select
          value={pageSize}
          onChange={(value) => {
            setPageSize(value as string);
            setPage(1);
          }}
          options={[
            { value: '10', label: '10' },
            { value: '25', label: '25' },
            { value: '50', label: '50' },
          ]}
        />
      </Cluster>
      <Pagination
        currentPage={page}
        pageCount={Math.ceil(240 / pageSizeNum)}
        onPageChange={setPage}
        size="sm"
      />
    </Cluster>
  );
}`}
      >
        <Cluster justify="between" align="center" wrap>
          <Cluster gap="sm" align="center">
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
              Rows per page
            </span>
            <Select
              value={pageSize}
              onChange={(value) => {
                setPageSize(value as string);
                setPageWithSize(1);
              }}
              options={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
              ]}
            />
          </Cluster>
          <Pagination
            currentPage={pageWithSize}
            pageCount={Math.ceil(240 / pageSizeNum)}
            onPageChange={setPageWithSize}
            size="sm"
          />
        </Cluster>
      </Example>
    </DemoBody>
  );
}

function CursorPaginationDemoPanel() {
  // Mini state machine for the "real" cursor demo — clamps within [0, 5]
  // pretend-pages so the buttons disable at the boundaries.
  const [cursor, setCursor] = useState(2);
  const hasPrev = cursor > 0;
  const hasNext = cursor < 5;

  return (
    <DemoBody files={getComponentFiles('CursorPagination')}>
      <Example
        title="Basic"
        description="Both buttons enabled — has both directions to navigate."
        code={`import { useState } from 'react';
import { CursorPagination, Stack } from '@eocrm/design-system';

export function Demo() {
  const [cursor, setCursor] = useState(2);
  const hasPrev = cursor > 0;
  const hasNext = cursor < 5;

  return (
    <Stack gap="xs">
      <CursorPagination
        hasPrevious={hasPrev}
        hasNext={hasNext}
        onPrevious={() => setCursor((c) => c - 1)}
        onNext={() => setCursor((c) => c + 1)}
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        cursor = {cursor} (range 0–5)
      </code>
    </Stack>
  );
}`}
      >
        <Stack gap="xs">
          <CursorPagination
            hasPrevious={hasPrev}
            hasNext={hasNext}
            onPrevious={() => setCursor((c) => c - 1)}
            onNext={() => setCursor((c) => c + 1)}
          />
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            cursor = {cursor} (range 0–5)
          </code>
        </Stack>
      </Example>

      <Example
        title="At the start (hasPrevious=false)"
        description="Previous is disabled. Layout doesn't shift — the button stays in the row."
        code={`import { CursorPagination } from '@eocrm/design-system';

export function Demo() {
  return (
    <CursorPagination
      hasPrevious={false}
      hasNext
      onPrevious={() => {}}
      onNext={() => {}}
    />
  );
}`}
      >
        <CursorPagination hasPrevious={false} hasNext onPrevious={() => {}} onNext={() => {}} />
      </Example>

      <Example
        title="At the end (hasNext=false)"
        description="Next is disabled. Same layout shape."
        code={`import { CursorPagination } from '@eocrm/design-system';

export function Demo() {
  return (
    <CursorPagination
      hasPrevious
      hasNext={false}
      onPrevious={() => {}}
      onNext={() => {}}
    />
  );
}`}
      >
        <CursorPagination hasPrevious hasNext={false} onPrevious={() => {}} onNext={() => {}} />
      </Example>

      <Example
        title="Custom labels — 'Newer' / 'Older'"
        description="For reverse-chronological feeds where 'Previous' means going to more recent items."
        code={`import { CursorPagination } from '@eocrm/design-system';

export function Demo() {
  return (
    <CursorPagination
      hasPrevious
      hasNext
      onPrevious={() => {}}
      onNext={() => {}}
      previousLabel="Newer"
      nextLabel="Older"
    />
  );
}`}
      >
        <CursorPagination
          hasPrevious
          hasNext
          onPrevious={() => {}}
          onNext={() => {}}
          previousLabel="Newer"
          nextLabel="Older"
        />
      </Example>
    </DemoBody>
  );
}

export function PaginationDemo() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('variant');
  const active: Variant = isVariant(raw) ? raw : 'pagination';

  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>Pagination</h1>
        <p className={styles.description}>
          Numbered nav with windowing for lists with a known total, plus a cursor variant for
          streams without one. Both controlled.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'pagination', label: 'Pagination' },
          { id: 'cursor-pagination', label: 'CursorPagination' },
        ]}
        activeId={active}
        onChange={(id) => setParams({ variant: id }, { replace: true })}
      />

      {active === 'pagination' && <PaginationDemoPanel />}
      {active === 'cursor-pagination' && <CursorPaginationDemoPanel />}
    </Stack>
  );
}
