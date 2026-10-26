import { pickActiveSection } from './activeSection';

const h = [
  { id: 'a', top: -400 },
  { id: 'b', top: 40 },
  { id: 'c', top: 900 },
];
it('last heading at or above the line wins', () =>
  expect(pickActiveSection(h, 80, false)).toBe('b'));
it('line exactly on a heading counts', () => expect(pickActiveSection(h, 40, false)).toBe('b'));
it('nothing passed yet → first', () =>
  expect(
    pickActiveSection(
      [
        { id: 'a', top: 300 },
        { id: 'b', top: 900 },
      ],
      80,
      false,
    ),
  ).toBe('a'));
it('scrolled to bottom → last, even if short', () =>
  expect(pickActiveSection(h, 80, true)).toBe('c'));
it('no headings → undefined', () => expect(pickActiveSection([], 80, true)).toBeUndefined());
