import { variables } from '@/core/theme/variables';
import { alpha, Box, type Theme } from '@mui/material';
import { type JSX, type RefObject, useEffect, useState } from 'react';

/** What marks an item as the chosen one, across tabs (aria-selected), radios (aria-checked) and nav items (aria-current). */
const SELECTED = '[aria-selected="true"],[aria-checked="true"],[aria-current="page"],[aria-current="true"]';

type Rect = { x: number; y: number; w: number; h: number };

export type SelectionIndicatorVariant = 'pill' | 'tint' | 'underline' | 'overline' | 'nav';

type Props = {
  /** The element holding the items. It must be `position: relative; isolation: isolate`. */
  rootRef: RefObject<HTMLElement | null>;
  variant: SelectionIndicatorVariant;
};

/** Position of the selected item inside the root, kept in step with layout, scrolling and selection changes. */
function useSelectedRect(rootRef: RefObject<HTMLElement | null>): { rect: Rect | undefined; ready: boolean } {
  const [rect, setRect] = useState<Rect | undefined>();
  // The first placement must not animate in from the corner. (Effect, not layout effect: the root's ref is only set after children's layout effects run.)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = (): void => {
      const target = root.querySelector<HTMLElement>(SELECTED);
      if (!target) {
        setRect(undefined);
        return;
      }
      const a = target.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      const next = {
        x: a.left - b.left + root.scrollLeft - root.clientLeft,
        y: a.top - b.top + root.scrollTop - root.clientTop,
        w: a.width,
        h: a.height
      };
      setRect((prev) =>
        prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next
      );
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    const mutation = new MutationObserver(measure);
    mutation.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'aria-checked', 'aria-current']
    });
    const frame = requestAnimationFrame(() => setReady(true));

    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootRef]);

  return { rect, ready };
}

const place = (x: number, y: number, w: number, h: number): Record<string, string | number> => ({
  width: w,
  height: h,
  transform: `translate(${x}px, ${y}px)`
});

const styleFor = (variant: SelectionIndicatorVariant, r: Rect, theme: Theme): Record<string, string | number> => {
  const radius = variables.radius.small;
  switch (variant) {
    case 'underline':
      return { ...place(r.x, r.y + r.h - 2, r.w, 2), background: theme.palette.primary.main };
    case 'overline':
      return { ...place(r.x, r.y, r.w, 2), background: theme.palette.primary.main };
    case 'tint':
      return { ...place(r.x, r.y, r.w, r.h), background: theme.palette.action.selected, borderRadius: radius };
    case 'nav':
      return {
        ...place(r.x, r.y, r.w, r.h),
        background: alpha(theme.palette.primary.main, 0.1),
        boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
        borderRadius: radius
      };
    default:
      return {
        ...place(r.x, r.y, r.w, r.h),
        background: theme.palette.background.default,
        boxShadow: `0 0 0 1px ${theme.palette.divider}`,
        borderRadius: radius
      };
  }
};

/**
 * One moving highlight for every tab-like control: it slides and resizes to whatever item is selected, so
 * switching never snaps. Items stay plain; only the marked one gets the indicator behind or beside it.
 */
export default function SelectionIndicator({ rootRef, variant }: Props): JSX.Element | null {
  const { rect, ready } = useSelectedRect(rootRef);
  if (!rect) return null;

  return (
    <Box
      aria-hidden
      data-selection-indicator={variant}
      sx={(theme) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: variant === 'underline' || variant === 'overline' ? 1 : -1,
        pointerEvents: 'none',
        transition: ready
          ? `transform ${variables.motion.base} ${variables.motion.easing}, width ${variables.motion.base} ${variables.motion.easing}, height ${variables.motion.base} ${variables.motion.easing}`
          : 'none',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...styleFor(variant, rect, theme)
      })}
    />
  );
}
