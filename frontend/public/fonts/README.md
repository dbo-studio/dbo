# Self-hosted fonts

Vendored WOFF2 files used by DBO Studio. Runtime loading is handled by `src/core/fonts`.

## Add a font

1. Add WOFF2 files under `public/fonts/<id>/`
   - Prefer `variable.woff2` (weight range `100 900`)
   - Or static `400.woff2` / `500.woff2` / `700.woff2` (UI) or `400`+`700` (editor)
2. Register the font in `src/core/fonts/registry.ts`
3. Add a row to `LICENSES.md`

Do **not** invent missing weights by copying another file.
