// Ambient declaration for CSS Modules so the library can be typechecked
// stand-alone (without depending on the consumer's vite/client types).
// At runtime the consumer's bundler (Vite, Next, etc.) provides the real
// hash-mapped object.

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
