import { resolve } from 'node:path';
import { parse, type Declaration, type Root, type Rule } from 'postcss';
import { compile } from 'sass';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AgentAvatar } from './AgentAvatar';

const stylesheet: Root = parse(compile(resolve(__dirname, './AgentAvatar.module.scss')).css);

function compiledRule(selector: string): Rule | undefined {
  let match: Rule | undefined;
  stylesheet.walkRules((rule) => {
    if (rule.selectors.some((s) => s.endsWith(selector))) match = rule;
  });
  return match;
}

function decl(rule: Rule | undefined, prop: string): Declaration | undefined {
  return rule?.nodes.find((n): n is Declaration => n.type === 'decl' && n.prop === prop);
}

const BADGE = '[data-part="badge"]';

describe('AgentAvatar', () => {
  it('renders the Bot fallback when no mark', () => {
    const { container } = render(<AgentAvatar name="Claude Code" />);
    expect(container.querySelector('[data-part="mark"] svg')).not.toBeNull();
  });

  it('renders a custom mark', () => {
    render(<AgentAvatar name="Claude Code" mark={<svg data-testid="m" />} />);
    expect(screen.getByTestId('m')).toBeInTheDocument();
  });

  it('agent alone: no badge, label is the agent', () => {
    const { container } = render(<AgentAvatar name="Claude Code" />);
    expect(screen.getByRole('img', { name: 'Claude Code' })).toBeInTheDocument();
    expect(container.querySelector(BADGE)).toBeNull();
  });

  it('member: badge with the member Avatar, label "on behalf of"', () => {
    const { container } = render(
      <AgentAvatar name="Claude Code · demo laptop" member={{ name: 'Ada Lovelace' }} />,
    );
    expect(
      screen.getByRole('img', { name: 'Claude Code · demo laptop, on behalf of Ada Lovelace' }),
    ).toBeInTheDocument();
    const badge = container.querySelector(BADGE);
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    expect(badge).toHaveTextContent('AL');
  });

  it.each([null, { name: '' }, { name: '  ' }])('erased via %j', (member) => {
    const { container } = render(<AgentAvatar name="Claude Code" member={member} />);
    expect(container.querySelector(`${BADGE}[data-erased]`)).not.toBeNull();
    expect(
      screen.getByRole('img', { name: 'Claude Code, on behalf of a former member' }),
    ).toBeInTheDocument();
  });

  it.each([
    [{ name: 'Ada Lovelace' }, 'Claude Code, on behalf of Ada Lovelace'],
    [null, 'Claude Code, on behalf of a former member'],
    [{ name: ' ' }, 'Claude Code, on behalf of a former member'],
  ])('no badge at size inline (%j)', (member, name) => {
    const { container } = render(<AgentAvatar name="Claude Code" size="inline" member={member} />);
    expect(container.querySelector(BADGE)).toBeNull();
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
  });

  it('decorative: aria-hidden, no role', () => {
    const { container } = render(<AgentAvatar decorative name="Claude Code" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).not.toHaveAttribute('role');
    expect(root).not.toHaveAttribute('aria-label');
  });

  it('component ARIA wins over consumer props', () => {
    render(<AgentAvatar name="Claude Code" aria-label="x" role="button" />);
    expect(screen.getByRole('img', { name: 'Claude Code' })).toBeInTheDocument();
  });

  it('forwards ref and spreads className/data attrs', () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <AgentAvatar ref={ref} name="Claude Code" className="x" data-foo="bar" />,
    );
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current).toHaveClass('x');
    expect(ref.current).toHaveAttribute('data-foo', 'bar');
    expect(ref.current).toHaveAttribute('data-agent-avatar');
  });

  it('ru copy', () => {
    render(
      <I18nProvider locale="ru">
        <AgentAvatar name="Claude Code" member={{ name: 'Ada Lovelace' }} />
      </I18nProvider>,
    );
    expect(
      screen.getByRole('img', { name: 'Claude Code, от имени: Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  describe('stylesheet', () => {
    it('constrains the mark svg to the wrapper', () => {
      const rule = compiledRule('.mark svg');
      expect(rule, 'rule exists').toBeDefined();
      expect(decl(rule, 'width')?.value).toBe('100%');
      expect(decl(rule, 'height')?.value).toBe('100%');
    });

    it('tile uses --agent-avatar-bg, not the hashed palette', () => {
      const background = decl(compiledRule('.tile'), 'background')?.value;
      expect(background).toBe('var(--agent-avatar-bg)');
      expect(background).not.toContain('--color-avatar-');
    });
  });
});
