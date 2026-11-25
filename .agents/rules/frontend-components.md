# Frontend components

Match the folder that is already there. Do not invent a second pattern.

- **One component per file.** A second `function Thing` in the same file is a new component and gets its own file. Markup that is only a styled wrapper belongs in `*.styled.ts`.
- **One component per folder.** `Component/Component.tsx` plus `Component.styled.ts` and, when the logic is real, `useComponent.ts`. Children get a subfolder. A hook, types, or util may sit next to that component; a second component may not.
- **Styles stay out of the component file.** Use `*.styled.ts`. An `sx` prop is for a one-off shorter than a styled component, not a block of layout.
- **Logic leaves the component** when it is state, effects, or store selection beyond a couple of lines. The component file should read as the render.
- **Renders:** subscribe to fast-changing state (stream tokens, keystrokes, scroll position) in the leaf that draws it. A parent that selects the whole session re-renders every row. Memoize a row only when its parent still re-renders for another reason.
- **Stop early.** Do not extract a component that is used once and has no state and no styles of its own. Do not copy a helper that already exists. A smaller file that adds a folder nobody imports is extra work.
- **E2E scenario per feature.** Anything the user can see or do needs a named Playwright scenario (`e2e/tests/…/*.spec.ts`), not a frontend unit test. One meaningful outcome per `test()`; steps via `test.step`. New or changed UI → extend an existing spec or add one, and add a row to the matrix in `e2e/README.md`. See `.agents/rules/go-testing.md` and `.agents/rules/e2e-qa.md`. Exceptions (real LLM, native desktop dialogs) stay documented in that matrix — do not use them to skip scenarios you can run without secrets.
