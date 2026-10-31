import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, type AtRule, type Rule } from 'postcss';
import { compile } from 'sass';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ChatBubble } from './ChatBubble';

const body = (root: HTMLElement) => root.querySelector<HTMLElement>('[class*="body"]')!;

describe('ChatBubble', () => {
  it('puts the speaker on the root class', () => {
    const { container, rerender } = render(<ChatBubble from="member">hi</ChatBubble>);
    expect((container.firstChild as HTMLElement).className).toMatch(/member/);
    rerender(<ChatBubble from="assistant">hi</ChatBubble>);
    expect((container.firstChild as HTMLElement).className).toMatch(/assistant/);
  });

  it('starts with a visually hidden role label', () => {
    const { container, rerender } = render(<ChatBubble from="member">hello</ChatBubble>);
    const label = screen.getByText('You said:', { exact: false });
    expect(label.className).toMatch(/root/); // VisuallyHidden
    expect(body(container).textContent).toBe('You said: hello');
    rerender(<ChatBubble from="assistant">hello</ChatBubble>);
    expect(screen.getByText('Assistant said:', { exact: false })).toBeInTheDocument();
  });

  it('renders the footer outside the coloured body', () => {
    const { container } = render(
      <ChatBubble from="assistant" footer={<button>Good</button>}>
        hi
      </ChatBubble>,
    );
    const footer = screen.getByRole('button', { name: 'Good' });
    expect(body(container).contains(footer)).toBe(false);
    expect((container.firstChild as HTMLElement).contains(footer)).toBe(true);
  });

  it('pending shows aria-hidden dots + one typing label, no children, no aria-busy', () => {
    const { container } = render(
      <ChatBubble from="assistant" pending>
        secret
      </ChatBubble>,
    );
    expect(screen.getAllByText('Assistant is typing…')).toHaveLength(1);
    expect(screen.queryByText('secret', { exact: false })).not.toBeInTheDocument();
    expect(container.querySelector('[class*="dots"]')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[aria-busy]')).toBeNull();
  });

  it('translates the label (ru)', () => {
    render(
      <I18nProvider locale="ru">
        <ChatBubble from="member">привет</ChatBubble>
      </I18nProvider>,
    );
    expect(screen.getByText('Вы написали:', { exact: false })).toBeInTheDocument();
  });

  it('forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ChatBubble ref={ref} from="member" className="extra">
        hi
      </ChatBubble>,
    );
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current?.className).toMatch(/bubble/);
    expect(ref.current).toHaveClass('extra');
  });

  describe('compiled CSS', () => {
    const css = parse(compile(resolve(__dirname, 'ChatBubble.module.scss')).css);

    it('root is a full-width row positioned by the parent, not align-self', () => {
      let width = '';
      let alignSelf = false;
      css.walkRules('.bubble', (r: Rule) => {
        r.walkDecls('width', (d) => {
          width = d.value;
        });
        r.walkDecls('align-self', () => {
          alignSelf = true;
        });
      });
      expect(width).toBe('100%');
      expect(alignSelf).toBe(false);
    });

    it('dot animation is disabled under prefers-reduced-motion', () => {
      let anim = '';
      css.walkAtRules('media', (m: AtRule) => {
        if (/prefers-reduced-motion:\s*reduce/.test(m.params)) {
          m.walkRules('.dot', (r) =>
            r.walkDecls('animation', (d) => {
              anim = d.value;
            }),
          );
        }
      });
      expect(anim).toBe('none');
    });
  });

  it('keeps tokens in the component tokens file', () => {
    const tokens = readFileSync(resolve(__dirname, 'ChatBubble.tokens.scss'), 'utf8');
    expect(tokens).toMatch(/--chat-bubble-max-width:\s*80%;/);
  });
});

describe('ChatBubble.List', () => {
  it('is a polite log; consumer role cannot override it', () => {
    render(
      <ChatBubble.List role="list" aria-label="Chat">
        <ChatBubble from="member">hi</ChatBubble>
      </ChatBubble.List>,
    );
    const log = screen.getByRole('log', { name: 'Chat' });
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ChatBubble.List ref={ref} className="extra" aria-label="c">
        x
      </ChatBubble.List>,
    );
    expect(ref.current).toBe(screen.getByRole('log'));
    expect(ref.current).toHaveClass('extra');
  });
});
