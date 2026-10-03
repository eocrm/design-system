# `<SocialButton>` — provider sign-in button

```tsx
<SocialButton provider="google" label="Continue with Google" onClick={signIn} />
```

- A `<Button>` (default `variant="secondary"`) with the provider's `<BrandIcon>` mark + `label`. `provider`: `'google'` / `'yandex'` (BrandIcon's set). Spreads Button props (`onClick`, `size`, `disabled`, …); width comes from the parent.
- The mark is decorative — `label` is the accessible name. For a non-SSO icon button use `<Button>` + a lucide icon.
