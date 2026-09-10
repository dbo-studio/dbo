import { LAYOUT_BREAKPOINTS, type LayoutMode } from '@/core/constants/layout';
import { useMediaQuery } from '@mui/material';

type LayoutModeState = {
  mode: LayoutMode;
  isMobile: boolean;
  isTablet: boolean;
  isCompact: boolean;
  /** @deprecated use isMobile || isTablet */
  isNarrow: boolean;
  isTouch: boolean;
  useSidebarOverlay: boolean;
  useCompactHeader: boolean;
  showConnectionsRail: boolean;
};

export const useLayoutMode = (): LayoutModeState => {
  const isMobile = useMediaQuery(`(max-width:${LAYOUT_BREAKPOINTS.mobile - 1}px)`);
  const isBelowTablet = useMediaQuery(`(max-width:${LAYOUT_BREAKPOINTS.tablet - 1}px)`);
  const isBelowCompact = useMediaQuery(`(max-width:${LAYOUT_BREAKPOINTS.compact - 1}px)`);
  const isAtLeastMobile = useMediaQuery(`(min-width:${LAYOUT_BREAKPOINTS.mobile}px)`);
  const isAtLeastTablet = useMediaQuery(`(min-width:${LAYOUT_BREAKPOINTS.tablet}px)`);
  const isTouch = useMediaQuery('(pointer: coarse)');

  const isTablet = isBelowTablet && isAtLeastMobile;
  const isCompact = isBelowCompact && isAtLeastTablet;

  const mode: LayoutMode = isMobile ? 'mobile' : isTablet ? 'tablet' : isCompact ? 'compact' : 'desktop';

  return {
    mode,
    isMobile,
    isTablet,
    isCompact,
    isNarrow: isMobile || isTablet,
    isTouch,
    useSidebarOverlay: isMobile || isTablet,
    useCompactHeader: isMobile || isTablet,
    showConnectionsRail: !isMobile && !isTablet
  };
};

export const getSidebarMaxWidth = (windowWidth: number): number => {
  return Math.min(500, Math.floor(windowWidth * 0.4));
};
