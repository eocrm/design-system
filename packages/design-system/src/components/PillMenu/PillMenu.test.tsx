import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { PillMenu, type PillMenuOption } from './PillMenu';
import { Field } from '../Field';
import { I18nProvider } from '../../i18n/I18nProvider';

beforeEach(() => {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const toDo: PillMenuOption = { id: 1, name: 'To do', category: 'to_do' };
const inProgress: PillMenuOption = { id: 2, name: 'In progress', category: 'in_progress' };
const done: PillMenuOption = { id: 3, name: 'Done', category: 'done' };
const options: PillMenuOption[] = [toDo, inProgress, done];

describe('PillMenu — color resolution', () => {
  it('renders a trigger button with the current status name', () => {
    render(<PillMenu current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: /In progress/ })).toBeInTheDocument();
  });

  it('maps category="in_progress" to the blue palette color', () => {
    render(<PillMenu current={inProgress} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--pill-menu-bg')).toBe('var(--color-palette-blue-bg)');
    expect(trigger.style.getPropertyValue('--pill-menu-fg')).toBe('var(--color-palette-blue-fg)');
  });

  it('an explicit color wins over category', () => {
    render(<PillMenu current={{ ...inProgress, color: 'purple' }} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--pill-menu-bg')).toBe('var(--color-palette-purple-bg)');
  });

  it('falls back to slate with no category and no color', () => {
    render(<PillMenu current={{ id: 9, name: 'Mystery' }} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--pill-menu-bg')).toBe('var(--color-palette-slate-bg)');
  });
});

describe('PillMenu — interactive mode', () => {
  it('opens the menu on click and renders every option as a menuitem with its own color', async () => {
    const user = userEvent.setup();
    render(<PillMenu current={toDo} options={options} />);
    await user.click(screen.getByRole('button'));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[1].style.getPropertyValue('--pill-menu-bg')).toBe('var(--color-palette-blue-bg)');
  });

  it('clicking an option fires onSelect with the option id and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PillMenu current={toDo} options={options} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: 'Done' }));
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ArrowDown then Enter selects the highlighted option', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PillMenu current={toDo} options={options} onSelect={onSelect} />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('disabled trigger is disabled and does not open on click', async () => {
    const user = userEvent.setup();
    render(<PillMenu current={toDo} options={options} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not reopen when busy clears after forcing an open menu closed', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PillMenu current={toDo} options={options} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    rerender(<PillMenu current={toDo} options={options} busy />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rerender(<PillMenu current={toDo} options={options} busy={false} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('busy trigger gets aria-busy and is disabled', () => {
    render(<PillMenu current={toDo} options={options} busy />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-busy', 'true');
    expect(trigger).toBeDisabled();
  });

  it('aria-label uses the i18n change-status string with the current name', () => {
    render(<PillMenu current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: 'Change status: In progress' })).toBeInTheDocument();
  });

  it('forwards ref to the trigger button', () => {
    const ref = createRef<HTMLElement>();
    render(<PillMenu current={toDo} options={options} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges className with the internal trigger class', () => {
    render(<PillMenu current={toDo} options={options} className="external" />);
    const trigger = screen.getByRole('button');
    expect(trigger.className).toMatch(/external/);
  });
});

describe('PillMenu — read-only mode', () => {
  it('renders a plain span (no button role, no aria-haspopup) when options is omitted', () => {
    render(<PillMenu current={done} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const chip = screen.getByText('Done');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).not.toHaveAttribute('aria-haspopup');
  });

  it('renders a plain span when options is an empty array', () => {
    render(<PillMenu current={done} options={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Done').tagName).toBe('SPAN');
  });

  it('still applies the resolved color to the read-only chip', () => {
    render(<PillMenu current={done} />);
    const chip = screen.getByText('Done');
    expect(chip.style.getPropertyValue('--pill-menu-bg')).toBe('var(--color-palette-green-bg)');
  });

  it('forwards ref to the span in read-only mode', () => {
    const ref = createRef<HTMLElement>();
    render(<PillMenu current={done} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges className with the internal chip class', () => {
    render(<PillMenu current={done} className="external" />);
    expect(screen.getByText('Done').className).toMatch(/external/);
  });
});

describe('busy state reaches assistive tech (#488)', () => {
  it('announces from a live region rather than aria-busy alone', () => {
    const { rerender, container } = render(
      <PillMenu current={inProgress} options={options} busy={false} />,
    );
    const region = container.querySelector('[role="status"][aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toBe('');
    rerender(<PillMenu current={inProgress} options={options} busy />);
    expect(region!.textContent).toBe('Saving…');
  });

  it('leaves the trigger name alone while busy', () => {
    const { rerender, getByRole } = render(
      <PillMenu current={inProgress} options={options} busy={false} />,
    );
    expect(getByRole('button', { name: 'Change status: In progress' })).not.toBeNull();
    rerender(<PillMenu current={inProgress} options={options} busy />);
    expect(getByRole('button', { name: 'Change status: In progress' })).not.toBeNull();
  });

  it('keeps the region OUTSIDE the trigger', () => {
    // The by-name assertion above cannot catch PillMenu's actual bug. The
    // trigger sets an explicit aria-label, which wins over name-from-content,
    // so its name is invariant to anything nested inside it — the name test
    // passes with the region back in the button. PillMenu's failure mode is
    // PRUNING, not renaming: `button` is children-presentational in ARIA, so a
    // region nested in it is spec'd to be dropped. That has to be asserted
    // structurally.
    const { container, getByRole } = render(
      <PillMenu current={inProgress} options={options} busy />,
    );
    expect(getByRole('button').querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});

it('mounts the region EMPTY, so the word always arrives as a change', () => {
  // Server render runs the render pass and NOT effects, so this is literally
  // the first-paint DOM. That is the only way to observe the deferral: RTL's
  // render() flushes passive effects inside act(), so by the time a test reads
  // the region the effect has landed — and the old render-time version
  // produced the same final text. The previous version of this test passed
  // against the exact bug it was written to pin.
  const html = renderToStaticMarkup(<PillMenu current={inProgress} options={options} busy />);
  // Asserted as an EMPTY element, not as "does not contain the word". The
  // word-based form went blind the moment anyone renamed the i18n string:
  // review verified that reverting the deferral AND renaming `pillMenu.busy`
  // made this pass against the very bug it pins. This shape cannot be
  // satisfied by a rename, and it also pins `aria-live="polite"`.
  //
  // Load-bearing pair: this asserts the region mounts EMPTY, and the sibling
  // test below asserts the word then arrives. Delete the text binding entirely
  // and this one still passes — it certifies the first half only. Weaken the
  // sibling and the pair degrades back to the vacuous state both were written
  // to escape.
  const region = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('[role="status"]');
  expect(region, 'the region exists on first paint').not.toBeNull();
  expect(region!.getAttribute('aria-live')).toBe('polite');
  expect(region!.textContent).toBe('');
});

it('announces even when it mounts already busy', async () => {
  // Mounting region and text together is the case Hard rule 10 forbids: most
  // screen readers do not announce content that was already present when the
  // region appeared. The text is deferred one tick so the word always arrives
  // as a change, including on a route remount or a virtualized row scrolling
  // back into view mid-flight.
  const { container } = render(<PillMenu current={inProgress} options={options} busy />);
  const region = container.querySelector('[role="status"][aria-live="polite"]');
  expect(region).not.toBeNull();
  await waitFor(() => expect(region!.textContent).toBe('Saving…'));
});

describe('PillMenu — general value menu (#572)', () => {
  it('label names what the value is in the trigger', () => {
    render(<PillMenu label="type" current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: 'Change type: In progress' })).toBeInTheDocument();
  });

  it('label is localized through the template (ru)', () => {
    render(
      <I18nProvider locale="ru">
        <PillMenu label="тип" current={inProgress} options={options} />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Изменить тип: In progress' })).toBeInTheDocument();
  });

  it('a consumer aria-label cannot replace the component-owned name', () => {
    render(<PillMenu aria-label="Nope" current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: 'Change status: In progress' })).toBeInTheDocument();
  });

  it('icons render before the name in the pill and each row, hidden from AT', async () => {
    render(
      <PillMenu
        label="type"
        current={{ ...inProgress, icon: <svg data-testid="cur-icon" /> }}
        options={options.map((o, i) => ({ ...o, icon: <svg data-testid={`opt-icon-${i}`} /> }))}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Change type: In progress' });
    const curIcon = screen.getByTestId('cur-icon');
    expect(trigger).toContainElement(curIcon);
    expect(curIcon.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(trigger.firstElementChild).toBe(curIcon.parentElement);
    await userEvent.click(trigger);
    const item = screen.getAllByRole('menuitem')[0];
    expect(item).toContainElement(screen.getByTestId('opt-icon-0'));
    expect(item).toHaveAccessibleName(options[0].name);
    expect(screen.getByTestId('opt-icon-0').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('read-only chip renders the icon too', () => {
    render(<PillMenu current={{ ...inProgress, icon: <svg data-testid="ro-icon" /> }} />);
    expect(screen.getByTestId('ro-icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('typeahead still selects rows by name, with or without icons', async () => {
    const onSelect = vi.fn();
    render(
      <PillMenu
        current={inProgress}
        options={[toDo, { ...done, icon: <svg /> }]}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Change status: In progress' }));
    await userEvent.keyboard('d{Enter}');
    expect(onSelect).toHaveBeenCalledWith(done.id);
  });

  it('row icons take the row colour, not the menu grey', () => {
    const scss = readFileSync(resolve(__dirname, 'PillMenu.module.scss'), 'utf8');
    expect(scss).toMatch(
      /\.option\.option\s*\{[^}]*--dropdown-menu-icon-fg:\s*var\(--pill-menu-fg\)/,
    );
  });
});

describe('PillMenu — fullWidth (#578)', () => {
  const CURRENT: PillMenuOption = { id: 'high', name: 'High', color: 'red' };
  const OPTIONS: PillMenuOption[] = [{ id: 'low', name: 'Low', color: 'slate' }];

  it('stretches the trigger, chevron last', () => {
    render(<PillMenu fullWidth current={CURRENT} options={OPTIONS} />);
    const trigger = screen.getByRole('button');
    expect(trigger.className).toMatch(/fullWidth/);
    expect(trigger.lastElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('stretches the read-only chip', () => {
    const { container } = render(<PillMenu fullWidth current={CURRENT} />);
    expect((container.firstChild as HTMLElement).className).toMatch(/fullWidth/);
  });

  it('is content-width by default', () => {
    render(<PillMenu current={CURRENT} options={OPTIONS} />);
    expect(screen.getByRole('button').className).not.toMatch(/fullWidth/);
  });

  it('fills its container, chevron pushed to the end edge', () => {
    const scss = readFileSync(resolve(__dirname, 'PillMenu.module.scss'), 'utf8');
    expect(scss).toMatch(/\.fullWidth\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;/);
    expect(scss).toMatch(/>\s*\.chevron\s*\{[^}]*margin-inline-start:\s*auto;/);
  });
});

describe('PillMenu — inside a Field (#578)', () => {
  const CURRENT: PillMenuOption = { id: 'bug', name: 'Bug', color: 'red' };
  const OPTIONS: PillMenuOption[] = [{ id: 'story', name: 'Story', color: 'green' }];

  it('keeps its own name, takes the error text and invalid, leaks no bogus attributes', () => {
    render(
      <Field label="Type" error="Pick a type" required>
        <PillMenu fullWidth label="type" current={CURRENT} options={OPTIONS} />
      </Field>,
    );
    const trigger = screen.getByRole('button', { name: 'Change type: Bug' });
    expect(trigger).toHaveAccessibleDescription('Pick a type');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).not.toHaveAttribute('aria-labelledby');
    expect(trigger).not.toHaveAttribute('invalid');
    expect(trigger).not.toHaveAttribute('required');
  });

  it('the read-only chip ignores invalid (not a control)', () => {
    const { container } = render(<PillMenu invalid current={CURRENT} />);
    expect(container.firstChild).not.toHaveAttribute('aria-invalid');
    expect(container.firstChild).not.toHaveAttribute('invalid');
  });

  it('warns in dev when a Field label arrives but `label` is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(
      <Field label="Priority">
        <PillMenu current={CURRENT} options={[...OPTIONS]} />
      </Field>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no `label`'));
    // Once — not again on every re-render with a fresh options array.
    rerender(
      <Field label="Priority">
        <PillMenu current={CURRENT} options={[...OPTIONS]} />
      </Field>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();
    render(
      <Field label="Type">
        <PillMenu label="type" current={CURRENT} options={OPTIONS} />
      </Field>,
    );
    expect(warn).not.toHaveBeenCalled();
    // Read-only chip: `label` changes nothing there, so no advice to pass it.
    render(
      <Field label="Type">
        <PillMenu current={CURRENT} />
      </Field>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ignores aria-labelledby at runtime, keeping the component-owned name', () => {
    const smuggled = { 'aria-labelledby': 'elsewhere' } as object;
    render(<PillMenu label="type" current={CURRENT} options={OPTIONS} {...smuggled} />);
    const trigger = screen.getByRole('button', { name: 'Change type: Bug' });
    expect(trigger).not.toHaveAttribute('aria-labelledby');
  });

  it('stays content-width as a stretching flex item unless fullWidth', () => {
    const scss = readFileSync(resolve(__dirname, 'PillMenu.module.scss'), 'utf8');
    expect(scss).toMatch(/\.trigger,\s*\.chip\s*\{[^}]*width:\s*fit-content;/);
    // Same specificity: .fullWidth's width: 100% only wins by coming later.
    expect(scss.indexOf('.fullWidth {')).toBeGreaterThan(scss.search(/\.trigger,\s*\.chip\s*\{/));
  });
});
