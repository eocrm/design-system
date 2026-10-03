# `<LocaleProvider>` + `useLocale` — locale Context

```tsx
<LocaleProvider locale="ru-RU">
  <App />
</LocaleProvider>;

const locale = useLocale(); // 'ru-RU', or navigator.language fallback
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `locale` | `string` | yes | — | BCP-47 locale string, e.g. 'en-US', 'ru-RU', 'de-DE'. |
| `children` | `ReactNode` | yes | — |  |

<!-- props:end -->

- `LocaleProvider` exposes a BCP-47 locale string to descendants. Any locale-aware component (Calendar primitives today; future Input formatters, currency widgets) reads via `useLocale()`.
- No `<LocaleProvider>` mounted? `useLocale()` falls back to `navigator.language` (or `'en-US'` in SSR / Node).
- Stateless. To switch locale at runtime, re-render the Provider with a new `locale` prop. Nested Providers override outer ones.
