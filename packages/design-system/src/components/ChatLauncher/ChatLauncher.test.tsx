import { resolve } from 'node:path';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ChatLauncher, type ChatLauncherProps } from './ChatLauncher';

// Same shape as Tabs.test.tsx's harness: jsdom has no ResizeObserver, so
// record callbacks per target and fire them by hand.
function stubResizeObserver() {
  const observed = new Map<Element, ResizeObserverCallback[]>();
  class MockResizeObserver {
    constructor(private cb: ResizeObserverCallback) {}
    observe = (target: Element) => {
      observed.set(target, [...(observed.get(target) ?? []), this.cb]);
    };
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return {
    resize(target: Element) {
      act(() => {
        for (const cb of observed.get(target) ?? []) {
          cb([{ target } as ResizeObserverEntry], null as unknown as ResizeObserver);
        }
      });
    },
  };
}

// jsdom has no layout: give the body element scroll metrics. The scrollTop
// setter clamps like a browser does.
function stubScroll(el: HTMLElement, initial: { scrollHeight: number; clientHeight: number }) {
  const m = { ...initial, scrollTop: 0 };
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => m.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => m.clientHeight });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => m.scrollTop,
    set: (v: number) => {
      m.scrollTop = Math.max(0, Math.min(v, m.scrollHeight - m.clientHeight));
    },
  });
  return m;
}

type Props = Partial<ChatLauncherProps> & { children?: ReactNode };

function setup(props: Props = {}) {
  const onOpenChange = vi.fn();
  const ui = (p: Props) => (
    <ChatLauncher
      label="Ask Scout"
      title="Scout"
      icon={<span>*</span>}
      open={false}
      onOpenChange={onOpenChange}
      {...p}
    >
      {p.children ?? <p>hello</p>}
    </ChatLauncher>
  );
  const utils = render(ui(props));
  return {
    ...utils,
    onOpenChange,
    rerender: (p: Props) => utils.rerender(ui({ ...props, ...p })),
    launcher: () => screen.getByRole('button', { name: 'Ask Scout' }),
    panel: () => screen.getByRole('dialog', { hidden: true }),
  };
}

const body = (panel: HTMLElement) => panel.querySelector<HTMLElement>('[class*="body"]')!;

describe('ChatLauncher', () => {
  beforeEach(() => {
    stubResizeObserver();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('launcher is named by label, reflects open, controls the panel and toggles', async () => {
    const user = userEvent.setup();
    const { launcher, panel, onOpenChange, rerender } = setup();
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(launcher()).toHaveAttribute('aria-controls', panel().id);
    await user.click(launcher());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    rerender({ open: true });
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
    await user.click(launcher());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('panel is a non-modal dialog named by the title, hidden but mounted when closed', async () => {
    const user = userEvent.setup();
    const { panel, rerender } = setup({ children: <input aria-label="Draft" /> });
    expect(panel()).toHaveAttribute('hidden');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender({ open: true, children: <input aria-label="Draft" /> });
    const dialog = screen.getByRole('dialog', { name: 'Scout' });
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(dialog).not.toHaveAttribute('hidden');
    await user.type(screen.getByLabelText('Draft'), 'half a thought');
    rerender({ open: false, children: <input aria-label="Draft" /> });
    rerender({ open: true, children: <input aria-label="Draft" /> });
    expect(screen.getByLabelText('Draft')).toHaveValue('half a thought');
  });

  describe('focus', () => {
    it('open moves focus to initialFocusRef', () => {
      const inputRef = createRef<HTMLInputElement>();
      const footer = <input ref={inputRef} aria-label="Message" />;
      const { rerender } = setup({
        footer,
        initialFocusRef: inputRef as RefObject<HTMLElement | null>,
      });
      rerender({ open: true });
      expect(screen.getByLabelText('Message')).toHaveFocus();
    });

    it('open without initialFocusRef focuses the panel', () => {
      const { rerender, panel } = setup();
      rerender({ open: true });
      expect(panel()).toHaveFocus();
      expect(panel()).toHaveAttribute('tabindex', '-1');
    });

    it('does not move focus already inside the panel', () => {
      const { rerender } = setup({ children: <button>inside</button> });
      // Focus a child while closed (jsdom ignores `hidden`), then open.
      screen.getByRole('button', { name: 'inside', hidden: true }).focus();
      rerender({ open: true });
      expect(screen.getByRole('button', { name: 'inside' })).toHaveFocus();
    });

    it('Escape inside the panel closes and returns focus to the launcher', () => {
      const { rerender, onOpenChange, launcher } = setup({
        open: true,
        children: <input aria-label="Draft" />,
      });
      const input = screen.getByLabelText('Draft');
      input.focus();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      rerender({ open: false });
      expect(launcher()).toHaveFocus();
    });

    it('Escape on the launcher while open closes', () => {
      const { rerender, onOpenChange, launcher } = setup({ open: true });
      launcher().focus();
      fireEvent.keyDown(launcher(), { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      rerender({ open: false });
      expect(launcher()).toHaveFocus();
    });

    it('ignores an Escape a child already handled; consumer onKeyDown still fires', () => {
      const onKeyDown = vi.fn();
      const { onOpenChange } = setup({
        open: true,
        onKeyDown,
        children: <input aria-label="Menu" onKeyDown={(e) => e.preventDefault()} />,
      });
      fireEvent.keyDown(screen.getByLabelText('Menu'), { key: 'Escape' });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(onKeyDown).toHaveBeenCalled();
    });

    it('close button is translated, closes and returns focus to the launcher', async () => {
      const user = userEvent.setup();
      const { rerender, onOpenChange, launcher } = setup({ open: true });
      await user.click(screen.getByRole('button', { name: 'Close chat' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      rerender({ open: false });
      expect(launcher()).toHaveFocus();
    });

    it('close button reads "Закрыть чат" in ru', () => {
      render(
        <I18nProvider locale="ru">
          <ChatLauncher label="Скаут" title="Скаут" icon="*" open onOpenChange={() => {}}>
            x
          </ChatLauncher>
        </I18nProvider>,
      );
      expect(screen.getByRole('button', { name: 'Закрыть чат' })).toBeInTheDocument();
    });

    it('a new initialFocusRef identity while open does not pull focus back in', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const a = createRef<HTMLElement>();
      const { rerender } = setup({ open: true, initialFocusRef: a });
      outside.focus();
      rerender({ initialFocusRef: createRef<HTMLElement>() });
      expect(outside).toHaveFocus();
      outside.remove();
    });

    it('mounting open does not move focus into the panel', () => {
      const { panel } = setup({ open: true });
      expect(panel()).not.toHaveFocus();
      expect(document.body).toHaveFocus();
    });

    it('ignores an Escape from a portaled descendant outside the chat DOM', () => {
      const { onOpenChange } = setup({
        open: true,
        children: createPortal(<input aria-label="Portaled" />, document.body),
      });
      fireEvent.keyDown(screen.getByLabelText('Portaled'), { key: 'Escape' });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('programmatic close does not steal focus from outside the panel', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const { rerender } = setup({ open: true });
      outside.focus();
      rerender({ open: false });
      expect(outside).toHaveFocus();
      outside.remove();
    });
  });

  it('portals to document.body, not into the render container', () => {
    const { container, panel } = setup();
    expect(container.contains(panel())).toBe(false);
    expect(panel().parentElement?.parentElement).toBe(document.body);
  });

  describe('stick to bottom', () => {
    it('follows growth at the bottom, keeps position when scrolled up, restores on reopen', () => {
      const ro = stubResizeObserver();
      const { rerender, panel } = setup();
      const el = body(panel());
      const content = el.firstElementChild!;
      const m = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 });

      // First open → bottom.
      rerender({ open: true });
      expect(m.scrollTop).toBe(600);
      fireEvent.scroll(el);

      // Grow while at bottom → follows.
      m.scrollHeight = 1200;
      ro.resize(content);
      expect(m.scrollTop).toBe(800);
      fireEvent.scroll(el);

      // Grow while scrolled up → left alone.
      m.scrollTop = 100;
      fireEvent.scroll(el);
      m.scrollHeight = 1400;
      ro.resize(content);
      expect(m.scrollTop).toBe(100);

      // Close scrolled up; the browser drops scroll on display:none; reopen → restored.
      rerender({ open: false });
      m.scrollTop = 0;
      rerender({ open: true });
      expect(m.scrollTop).toBe(100);

      // Back to bottom, close, content arrives while closed (observer ignored), reopen → bottom.
      m.scrollTop = 1000;
      fireEvent.scroll(el);
      rerender({ open: false });
      m.scrollTop = 0;
      m.scrollHeight = 2000;
      ro.resize(content);
      expect(m.scrollTop).toBe(0);
      rerender({ open: true });
      expect(m.scrollTop).toBe(1600);
    });
    it('re-sticks to the bottom when the body itself shrinks', () => {
      const ro = stubResizeObserver();
      const { rerender, panel } = setup();
      const el = body(panel());
      const m = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 });
      rerender({ open: true });
      fireEvent.scroll(el);
      expect(m.scrollTop).toBe(600);
      // Composer grows / mobile keyboard opens: the body gets shorter.
      m.clientHeight = 300;
      ro.resize(el);
      expect(m.scrollTop).toBe(700);
    });
  });

  it('forwards ref to the panel; className/id/data-* land on it; role/hidden win', () => {
    const ref = createRef<HTMLDivElement>();
    const { panel, launcher } = setup({
      ref,
      className: 'extra',
      id: 'chat',
      'data-test': 'x',
      role: 'region',
      hidden: false,
    } as Props);
    expect(ref.current).toBe(panel());
    expect(panel()).toHaveClass('extra');
    expect(panel().className).toMatch(/panel/);
    expect(panel()).toHaveAttribute('id', 'chat');
    expect(launcher()).toHaveAttribute('aria-controls', 'chat');
    expect(panel()).toHaveAttribute('data-test', 'x');
    expect(panel()).toHaveAttribute('role', 'dialog');
    expect(panel()).toHaveAttribute('hidden');
  });

  describe('compiled CSS', () => {
    const css = parse(compile(resolve(__dirname, 'ChatLauncher.module.scss')).css);
    const decl = (selector: string, prop: string) => {
      let value = '';
      css.walkRules(selector, (r: Rule) =>
        r.walkDecls(prop, (d) => {
          value = d.value;
        }),
      );
      return value;
    };

    it('the flex panel still hides with [hidden]', () => {
      expect(decl('.panel', 'display')).toBe('flex');
      expect(decl('.panel[hidden]', 'display')).toBe('none');
    });

    it('root layers on --z-chat-launcher', () => {
      expect(decl('.root', 'z-index')).toBe('var(--z-chat-launcher)');
    });
  });
});
