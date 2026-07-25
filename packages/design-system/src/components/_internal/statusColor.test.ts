import { STATUS_CATEGORY_COLOR, resolveStatusColor } from './statusColor';

describe('_internal/statusColor', () => {
  it('maps every category to its documented default color', () => {
    expect(STATUS_CATEGORY_COLOR).toEqual({
      to_do: 'slate',
      in_progress: 'blue',
      open: 'violet',
      done: 'green',
      won: 'green',
      lost: 'red',
    });
  });

  it('resolves the category default when no color is set', () => {
    expect(resolveStatusColor({ category: 'in_progress' })).toBe('blue');
  });

  it('an explicit color wins over category', () => {
    expect(resolveStatusColor({ category: 'in_progress', color: 'purple' })).toBe('purple');
  });

  it('falls back to slate with no category and no color', () => {
    expect(resolveStatusColor({})).toBe('slate');
  });
});
