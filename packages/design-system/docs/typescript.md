# TypeScript

Getting prop types to resolve in your editor.

Every prop and variant type is typed. If your editor shows no types:

- Confirm `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json`.
- Confirm your IDE's TS server is running.
- The package ships compiled ESM with `.d.ts` types (`types: ./dist/index.d.ts`); no `transpilePackages`, Sass or TSX loader config is needed.
- If `tsc` rejects the side-effect `import '@eocrm/design-system/styles/global.css'` (TS2882), add `declare module '*.css';` to a `.d.ts` file — Vite's `vite/client` and Next's `next-env.d.ts` already declare it.
