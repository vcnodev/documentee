# Package Boundaries

Packages publish built `dist` files. Package manifests should export:

```json
{
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "import": "./dist/src/index.js"
    }
  }
}
```

Do not make package consumers import TypeScript source files. Tests enforce that publishable packages include `README.md` and built-file exports.
