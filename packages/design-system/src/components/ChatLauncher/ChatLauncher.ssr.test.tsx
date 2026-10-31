// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { ChatLauncher } from './ChatLauncher';

it('server-renders without touching document', () => {
  expect(typeof document).toBe('undefined');
  expect(() =>
    renderToString(
      <ChatLauncher label="Ask" title="Scout" icon="*" open={false} onOpenChange={() => {}}>
        hi
      </ChatLauncher>,
    ),
  ).not.toThrow();
});
