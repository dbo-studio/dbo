# UI Baseline: Design System Contract

Direction: minimal, flat, neutral, and content-first (VSCode / Zed feel). One accent colour; status colours only for status. The goal is a dependable desktop tool, not a marketing dashboard or a card-based admin template.

This document is both the contributor contract and the review record. The verified findings and the approved modernization items below have been implemented; the table in [Done so far](#done-so-far) lists what changed.

## Review scope and recommendation

Reviewed the desktop frontend through its rendered layout and source: activity rail, explorer, workspace tabs, SQL editor and results, data grid, bottom panel, settings, command palette implementation, connection picker, connection forms, first-run onboarding, empty states, and help/discovery surfaces. Rendered checks covered DBO light and dark themes at 1440×900, including a real SQLite connection, a 40-row result set, the onboarding welcome step, and the post-skip first-run screen.

**Recommendation: evolve the existing system; do not redesign the workspace.** The shell already has the right structure and density. Fix verified contract drift and form UX first, then modernize selected features through existing components and tokens.

Non-negotiable boundaries:

- **Freeze the default palette.** Do not change colour values in `frontend/src/core/theme/palettes/dbo.ts`. Improvements must come from hierarchy, spacing, state, typography, and interaction using the current palette.
- **Leave `DataGrid` visually unchanged** unless a separately approved task specifically targets it.
- **Reuse MUI, the theme, and current base components.** No parallel design system, new component library, or new colour tokens for one-off screens.
- **Keep desktop density.** Do not apply mobile-sized controls or spacious marketing layouts to the desktop workspace.

## Design language

- **Content before chrome:** the editor, data, and current task are dominant. Rails, toolbars, and status areas stay quiet.
- **Flat surfaces:** use hairline dividers to separate regions. Avoid decorative cards, gradients, glow, and elevated workspace panels.
- **One accent:** selected and active emphasis uses `primary.main` or the text-safe `text.link`. Pink remains `text.accent`; it is not a second selection colour.
- **Status is semantic:** success, warning, and error colours communicate state only. Do not use them as decoration.
- **Compact, not cramped:** dense controls are appropriate, but labels, focus, errors, and hit areas must remain clear.
- **Predictable interaction:** similar actions use the same placement, variant, feedback, and keyboard behaviour.

## Ownership and token contract

| Concern | Owner | Consumer rule |
| --- | --- | --- |
| Palette | `core/theme/palettes/dbo.ts` and other palette factories | Use `theme.palette.*` and `alpha()`; never hardcode hex/rgb/hsl in product code. |
| Control, icon, radius, type-size, and motion values | `core/theme/variables.ts` | Reuse the existing value; add a token only when the same decision has multiple real consumers. |
| Typography | `core/theme/typography.ts` | Prefer variants; use `variables.fontSize` for dense labels not covered by a variant. |
| MUI appearance | `core/theme/overrides/` | Restyle MUI centrally instead of creating a visual wrapper. |
| Touch density | `core/theme/mobileDensity.ts`, `mobileSurfaces.ts` | Keep touch overrides separate from desktop values. |
| Product composites | `components/common/` | Compose base/MUI components; do not restyle the global theme locally. |
| Screen layout | `routes/`, `layout/` | Use theme spacing and existing patterns. Move repeated or long `sx` blocks to `*.styled.ts`. |

### Core values

- **Controls:** `variables.control` = 24px for Button, IconButton, Input, Select, and `SelectInput`, in forms, dialogs, toolbars, and grids. Chip is 20px.
- **No `size` prop** on Button, IconButton, TextField, Select, Autocomplete, Chip, InputBase, `FieldInput`, `SelectInput`, or `CreatableSelectInput`. Checkbox, Switch, ToggleButtonGroup, Table, and `DateTimePicker` keep theirs because they size glyphs or density rather than control height.
- **Icons:** `CustomIcon` sizes `xs` 12, `s` 16 (default), `m` 20, `l` 28.
- **Radius:** `small` 4 for compact items, `medium` 5 for controls, `large` 12 for overlays (modals, menus, toasts). Keep `50%` for circles.
- **Type:** sentence case everywhere. Base desktop type is 13px; common dense text uses 12–13px through variants/tokens. Monaco numeric font settings remain an explicit exception.
- **Spacing:** use MUI's 8px spacing scale (`theme.spacing`). Prefer 4, 8, 12, 16, and 24px rhythms; do not invent a second spacing system.
- **Motion:** use `variables.motion.fast/base/easing` for short feedback. The full contract is in [Motion](#motion) below.

### Shell geometry is an explicit exception

Shell regions are not form controls; do not force them into the 24px control rule or replace their dimensions through a blanket codemod.

| Shell element | Current geometry |
| --- | --- |
| Application header | 40px high; its icon buttons are 28px high |
| Activity rail | 48px wide; area buttons are 36×36px |
| Workspace/sidebar tab strips | 35px high |
| Bottom-panel header | 36px high |
| Application status bar | 24px high; clickable items are 20px high |
| Phone/touch | `mobileDensity.ts` raises controls and hit targets, including 44px icon buttons |

If these values are tokenized later, use a separate shell-size group. Do not mix them into `variables.control`.

## Component and UX contract

### Actions and toolbars

- Contained = primary action, outlined = secondary, text = tertiary such as Cancel. Destructive actions use `color='error'`.
- Tab toolbars use `ToolbarStyled` or the established local toolbar pattern: context controls left, icon actions with tooltips right.
- Keep one visually dominant action per task. A primary action may have a visible text label on wide screens and become an icon only when space requires it.
- Use overflow for secondary actions before allowing a toolbar to wrap unpredictably. Preserve shortcuts and tooltip names when actions move.

### Fields and async forms

- Visible labels sit above inputs; placeholder text is not a substitute for a label.
- Validation and request errors belong near the affected field when the field is known. Toasts supplement feedback for background or global outcomes.
- Pending actions expose loading and prevent duplicate submission without unnecessarily clearing or disabling the whole form.
- **Failed submission preserves all entered values.** Reset or unmount a form only after success. Test failure must not clear fields either.
- Cancellation is always available and does not masquerade as the primary action.

### Tabs and selected states

Different contexts may have different visuals, but the variant must be intentional and named; do not add another local tab style.

| Variant | Current exemplar | Rule |
| --- | --- | --- |
| Workspace tabs | `common/Panels/PanelTabs` | 35px strip, draggable/closable, strong active underline. Keep tab behaviour separate from visual tokens. |
| Sidebar/form section tabs | `base/SidebarSectionTabs`, `AddConnection.styled.ts` | Flat equal-width sections with the current underline treatment. Connection tabs now follow this pattern. |
| Bottom-panel tabs | `layout/BottomPanel` | Compact text tabs with a selected background; no workspace drag/close behaviour. |
| Mobile editor/results | MUI `MuiTabs-flat` / `Mui-flat` | Full-width flat switching; retain the mobile-specific layout. |

Do not merge these implementations merely to reduce file count. Share visual decisions only where that does not scatter drag, close, keyboard, or responsive behaviour.

### Dialogs, menus, and toasts

- Use base `Modal` with actions in its `footer`: scrollable body, pinned right-aligned actions, Cancel/Close as text, primary contained action last.
- `ModalFooter spread` is reserved for forms that already embed it, such as connection Test + Cancel/Create.
- Short prompts and short forms should be content-sized using the existing `compact` capability. Reserve the 400px minimum height for the connection picker, complex forms, and resizable content that benefits from it.
- Dialogs (Modal, MUI Dialog), `ResizableModal` and `Toaster` use `variables.radius.large`. Menus and popovers stay at `variables.radius.medium`: their inner items are 4px, and a 12px outer radius looks mismatched around them.
- Menus and popovers use a hairline border and restrained shadow. Workspace regions do not use floating-card shadows.
- Toasts stay flat; status appears as the icon tint, not a fully tinted card.

### Empty, loading, error, and status states

- Use base `EmptyState` with a useful action when the user can resolve the empty state.
- Loading indicators reserve their region and avoid moving surrounding controls. Keep existing data visible during background refresh when possible.
- Use the application status bar for persistent connection/app state; do not duplicate it as banners or cards inside the page.
- Settings and Backup continue to use `SettingGroup`/`SettingRow`-style rows, not rounded cards.

### Motion

Motion in the workspace is functional feedback, not decoration. `variables.motion` currently defines `fast` 100ms, `base` 120ms, and one easing curve; that restraint is correct for a desktop tool and should be kept.

- Routine hover, focus, selection, and pressed feedback uses `variables.motion.fast/base` with the shared easing. Do not introduce local durations or curves.
- Animate `opacity`, `transform`, `color`, `background-color`, and `border-color`. Do not animate layout properties (`width`, `height`, `top/left`, padding) that reflow surrounding content; panel resizing stays instant or user-driven.
- No `transition: all`. List the animated properties explicitly.
- No infinite or ambient animation in the main workspace. Repeated motion draws attention away from data; a loop is acceptable only while a task is genuinely in progress (spinners, progress).
- Any non-trivial or repeated motion must respect `prefers-reduced-motion`. Today that handling exists only in `ProgressBar`, `ObjectTreeView`, `Onboarding`, and the mobile `ScreenStack`; new animated surfaces must include it from the start.
- State correctness must never depend on animation completion. Set async state directly; treat `transitionend`/animation callbacks as cosmetic only. Rapid toggles must be interruptible and replace in-flight transitions cleanly.
- Entrances longer than ~150ms are reserved for rare, intentional moments (first-run onboarding). Routine panel, dialog, tab, and menu transitions stay within `fast/base`.

## Done so far

| Change | Where |
| --- | --- |
| Single control height; `sm`/`md` split, large button and `sizeSmall`/`sizeLarge` rules removed | `core/theme/variables.ts`, `overrides/*` |
| About 400 redundant `size` props removed across 144 files; ESLint rule added | `eslint.config.mts` |
| `SelectInput` default height 32px replaced by `variables.control` | `base/SelectInput` |
| Toast restyled: flat card, 12px radius, hairline border, light shadow, status only as icon tint | `base/Toaster/Toaster.styled.ts` |
| Connection forms: equal side-by-side fields, tighter checkbox rows, 12px labels | `common/AddConnection` |
| Connection General/SSL/SSH tabs now use the flat underline-only direction | `common/AddConnection/AddConnection.styled.ts` |
| Palette redesign tried and rolled back; default DBO colours are preserved | `core/theme/palettes/dbo.ts` |
| P0: failed connection submit keeps entered values (the forms no longer reset after `onSubmit`; success closes the modal); e2e added | `common/AddConnection/*`, `e2e/tests/sqlite/connection-form-failure.spec.ts` |
| P1: short dialogs are content-sized with `compact` (SQLite connection, password prompts, restore confirm); Modal and MUI Dialog use the 12px `large` radius | `base/Modal`, `core/theme/overrides/Dialog.tsx` |
| Menus and popovers stay at `medium` (5px): a 12px outer radius looked mismatched around the 4px items | `core/theme/overrides/Menu.tsx` |
| Onboarding rebuilt as a fixed-size two-pane dialog (step rail plus one step, four steps); see [Onboarding](#onboarding) | `common/Onboarding/*`, `common/Account/AccountStep/AccountIntro.tsx` |
| Help is in the command palette (Documentation, Keyboard shortcuts, Show welcome, New connection) and the header menu; documentation opens on web too | `common/CommandPalette/useCommands.ts`, `layout/AppHeader/HeaderOverflowMenu`, `core/help/openDocs.ts` |
| NoSQL browse has a status bar again: New key, Delete, Refresh, key facts and the loaded count. Member grids (hash, list, set, zset) render their actions into the same bar | `routes/Browse/*` |
| Query toolbar: labelled Run/Stop button on desktop, "Beautify" spelling | `routes/Query/QueryEditorActionBar` |
| Connection picker: selected outline, double-click or Enter to continue, full names instead of two-line clamp | `common/AddConnection/ConnectionSelection` |
| Empty "No active connection" screen shows the command-palette hint; bottom-panel tabs use panel tokens | `common/Connections/ConnectionsEmptyState.tsx`, `layout/BottomPanel` |
| Literal `borderRadius` swapped for `variables.radius.*` where the value matched exactly; ESLint rule flags literal 3–12 | `eslint.config.mts` |
| Removed unused `TypewriterEffectText` after an import scan | `base/` |
| Empty workspace (connection open, no tab) shows the next step, six shortcuts and three feature tips instead of a bare icon | `common/Panels/WorkspaceEmpty` |
| Control-height audit: removed `height: 32` overrides on Pub/Sub buttons. The other literal heights (22/28/32/36/40) were reviewed and are shell geometry, list rows, chips or mobile rules, so they stay | `routes/Tool/PubSubTool.tsx` |
| History rows use the same lighter hover as the connection switcher | `common/Histories/HistoryItem` |

The data grid was not changed beyond removing redundant `size` props; its rendering and behaviour are outside this review's proposed changes.

## Onboarding

Onboarding is the one deliberate exception to "flat and quiet": it is a rare, intentional moment and may carry a little more personality. It still uses theme tokens only.

- Fixed-size dialog (`OnboardingShellStyled`, 860×560) so it never changes size between steps. The step rail sits on the left, one step on the right; the step content scrolls inside the frame.
- Steps: Welcome, Look (mode plus palettes drawn as miniature apps), Privacy, Account. Every step can be skipped, and Back, arrow keys and Enter work.
- Decoration is limited to a tinted rail with faint rings and a short fade-in per step and per logo tile. No infinite animation; reduced motion turns the fade-ins off.
- Reopen it from the command palette ("Show welcome").

## Audit of `components/base/`

An early plan to replace most wrappers with raw MUI was dropped. These components carry behaviour or product patterns that raw MUI would scatter across call sites.

| Verdict | Components | Reason |
| --- | --- | --- |
| Keep | `FieldInput`, `SelectInput`, `Search`, `FormError`, `EmptyState`, `ListSkeleton`, `DropDownMenu` | They own cursor-stable input, labels/helper tones, react-select behaviour, search, and shared product states. |
| Keep | `Modal`, `CustomIcon`, `Toaster`, `DateTimePicker`, `Grid`, `VirtualList`, `SortableList`, `NavRail`, `SplashScreen`, `AppMarkdown`, `SyntaxHighlighter`, `MermaidView`, editors | Real behaviour or product composition that MUI does not provide. |
| Keep | `ResizableBox`, `Toolbar`, `SidebarList` | Current callers exist in workspace panels, agent board views, Boards, and Backup. |
| Keep the helpers | `MongoEditor/mongoCompletions` | Used by Mongo query, browse, and inline editor paths; do not delete the directory from a component-name-only scan. |
| Verify before deleting | `TypewriterEffectText` | No consumer was found outside its own files in the current import scan. |
| Review per rendered surface | `ActionSheet`, `BottomSheet`, `PullIndicator`, `ContextMenu`, `ListRow`, `ScreenHeader`, `ProgressBar`, `Kbd` | Possible MUI overlap, but replacement is justified only if behaviour and screenshots remain equivalent. |

`frontend/package.json` currently has no `knip` script or dependency. Do not claim `npm run knip` as an available check; choose dead-code tooling deliberately, and confirm every deletion with an import scan.

## Verified findings

**Status: all five are resolved** (see [Done so far](#done-so-far)). They stay here as the record of the evidence. They were reproducible issues, not aesthetic preferences, ordered by user impact and system reach.

| Priority | Problem and evidence | Required correction | Scope | Confidence |
| --- | --- | --- | --- | --- |
| P0 — UX correctness | **Connection submission clears user input on failure.** A rejected SQLite create returned 400 and the Name/File fields visibly cleared. `SQLite.tsx:58-59` calls `onSubmit(data)` and immediately resets; PostgreSQL, MySQL, HostSql, Mongo, and Redis repeat the same pattern. | Make submission awaitable and reset only after resolved success, or rely on the successful modal close to unmount the form. Preserve values on rejection; keep Test independent from Create/Update. | `common/AddConnection/types.ts`, `AddConnection.tsx`, `EditConnection.tsx`, all six engine forms; add failure-preservation e2e coverage. | High |
| P1 — Dialog density | **Short connection forms reserve a large empty region.** Base `ModalWrapperStyled` enforces `min-height: min(400px, 90dvh)` (`Modal.styled.ts:18`); the two-field SQLite form rendered with a large blank gap. The existing `compact` prop is documented but has no Modal caller. | Apply content-driven/compact sizing to SQLite and other genuinely short prompts; retain the minimum height for the picker and complex forms. | `base/Modal`, Add/Edit Connection, existing short confirmation/prompt dialogs. | High |
| P1 — Overlay consistency | **The documented 12px overlay radius is not the runtime standard.** Base Modal and MUI Dialog use `medium` (5px), Menu/Popover also use `medium`, while ResizableModal and Toaster use `large` (12px). | Applied `variables.radius.large` to Modal and MUI Dialog (done). Menu and Popover stay at `medium` after review: 12px looked mismatched around 4px items. If 12px is no longer desired, revise the contract separately before implementation rather than preserving silent drift. | `base/Modal/Modal.styled.ts`, `core/theme/overrides/Dialog.tsx`, `core/theme/overrides/Menu.tsx`. | High |
| P2 — Onboarding visual mismatch | **First-run onboarding does not look like the product it introduces.** Rendered check: radial-gradient background, floating mock windows with an infinite `drift` loop, 420/520ms entrances, a 28px-radius panel, 48px pill buttons, and heavy shadows (`Onboarding.styled.ts`). The app behind it is flat, hairline-divided, and 100–120ms. | Keep the 7-step structure only if it earns its length; either way, restyle onboarding with the app's own surfaces: flat background, standard radius, standard contained buttons, and short entrances within the motion contract (it may remain the rare allowed longer entrance). Keep Skip, Back, and keyboard navigation, and keep reduced-motion handling. | `common/Onboarding/*`. | High |
| P2 — Help is scattered and partly missing | **Help exists but has no single home, and some of it is unreachable.** Documentation opens only from the desktop (Tauri) menu (`useDesktopMenu.ts` `openDocumentation` → `constants.docsUrl`); the web build has no in-app docs link. Shortcuts live only in Settings → Shortcuts (Alt+/). The header overflow menu has no Help entry. Once onboarding is finished or skipped (`accountStore` persists `onboarded`), nothing in the command palette, header menu, or settings can reopen it. | Consolidate, don't multiply: add Help/Documentation, Keyboard shortcuts, and "Show welcome" as command-palette entries in `useCommands.ts`, and reuse the existing header overflow menu rather than adding a header icon (forbidden by `frontend/AGENTS.md`). Provide a web-reachable documentation link. | `common/CommandPalette/useCommands.ts`, `layout/AppHeader/HeaderOverflowMenu`. | High |

The existing tab differences are not automatically defects: they serve different contexts. Their contract is documented above so future work does not introduce more variants without a reason.

## Feature modernization candidates

Implemented: connection picker, query toolbar (Run label and Beautify spelling), bottom panel, onboarding, empty state, help and discovery. **Not done:** moving the toolbar's secondary actions (minify, export, explain) into overflow; do that only when the toolbar visibly wraps. Each change was made on its own surface; keep screenshot review for any follow-up.

| Feature | Recommended change | Reason | Expected effort |
| --- | --- | --- | --- |
| Connection picker | Keep the four-column picker and current palette. Strengthen the selected card with `action.selected` plus a `primary.main` outline, and support Enter/double-click to continue while retaining the Create button. | Selection is currently mostly a neutral border/background; faster continuation would feel more like a desktop tool. | Small |
| Query editor toolbar | Keep context left and actions right. Make Run a labelled contained action on wide screens, retain its icon/shortcut on compact screens, and move secondary formatting actions into overflow only when needed. Rename the user-facing “Beatify” label to “Beautify”. | The main task should be easier to identify than utility actions; responsive overflow is more predictable than crowding. | Medium |
| Bottom panel | Keep Terminal/History, resizing, maximize, and close. Align its text-tab selected/hover treatment with the documented panel variant and remove one-off styling only where the shared decision already exists. | Consistency polish without changing a useful VSCode-like feature. | Small |
| Welcome / onboarding | Keep Skip, Back, keyboard navigation, and the theme/privacy choices. Restyle to the app's own visual language (flat surface, standard radius and buttons, motion-contract entrances) and consider cutting the 7-step marketing-style tour to a shorter task-oriented flow: welcome + connect, appearance, privacy/account. | First run currently feels like a product website, not the calm desktop tool behind it; a shorter flow respects the user's time. | Medium |
| Empty states | Keep base `EmptyState` everywhere. Give first-run and empty-workspace states one primary action plus at most one shortcut hint (e.g. command palette Alt+K). After onboarding is skipped, the "No active connection" screen is the entire first impression — New connection should stay primary, with an optional quiet secondary like opening the command palette. Do not grow empty states into dashboards. | The post-skip first-run screen rendered correctly but bare; good empty states teach the next step without adding chrome. | Small |
| Help and discovery | Consolidate existing help into the command palette (Documentation, Keyboard shortcuts, Show welcome, New connection, Open editor) and keep the header overflow menu as the only menu surface. Make the documentation link reachable on web, not only in the desktop menu. | Help already exists in five scattered places (palette, settings, desktop menu, AI prompts, terminal `help`); users should not have to know where each piece lives. | Small |

Do not redesign Settings, the activity rail, application status bar, or DataGrid as part of these candidates. Their current rendered structure is a useful reference for the rest of the app.

## Implementation sequence

1. **Foundation fixes (done):** resolve the verified findings (P0/P1 first, then the P2 experience gaps). Keep the default palette byte-for-byte unchanged and capture before/after screenshots.
2. **Token drift audit (radius, font size and control height done; the lint rules guard font size and radius):** map real violations to existing tokens and add the radius lint guard. Do not bulk-replace raw search matches.
3. **Approved feature work:** implement only the selected modernization candidates, one surface at a time, with responsive and keyboard checks. Experience polish (onboarding, empty states, help) comes after the foundation fixes so it lands on stable contracts.
4. **Dead-code cleanup (`TypewriterEffectText` removed; the review-per-surface components remain):** remove only confirmed unused components/exports after the UI contracts are stable.

Current raw search counts are audit leads, **not violation counts**: 196 `borderRadius` occurrences in 119 files, 142 `fontSize` occurrences in 72 files, and 31 occurrences of selected hardcoded heights (22/28/32/36/40) in 21 files. They include valid theme values, token references, shell geometry, mobile rules, and grid internals.

## Acceptance checklist

- Default `dbo.ts` palette values and DataGrid appearance are unchanged.
- Before/after screenshots exist for DBO light and dark at 1440×900; include compact desktop and phone/tablet only when shared responsive code changes.
- Exercise default, hover, focus-visible, selected, disabled, loading, empty, and error states affected by the change.
- Keyboard flow still works for tabs, menus, dialogs, forms, the editor, and the command palette.
- Failed async forms preserve values; successful forms close/reset exactly once.
- New or changed motion stays within `variables.motion`, lists explicit properties, and is verified with `prefers-reduced-motion` enabled.
- Empty states affected by the change show one clear primary action and, where useful, one shortcut hint.
- No new local colour, radius, font-size, control-height, motion, or tab variant is introduced.
- Run frontend lint/build and the affected Playwright e2e suites. Add e2e coverage for user-visible behaviour; do not add frontend unit tests.
