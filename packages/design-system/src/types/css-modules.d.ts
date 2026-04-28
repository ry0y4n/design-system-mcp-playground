// Ambient typings for CSS Modules. Without this, TypeScript can't resolve
// `import styles from "./Foo.module.css"` in generated components.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Plain CSS imports (e.g. `import "./tokens.css"`) — no exported value.
declare module "*.css";
