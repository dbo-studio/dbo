import { Box, type BoxProps, type SxProps, type Theme } from '@mui/material';
import {
  createContext,
  type CSSProperties,
  type JSX,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

type GridProps = BoxProps & {
  children: ReactNode;
  breakpointValues?: Partial<Record<Exclude<Breakpoint, 'xs'>, number>>;
  columns?: ResponsiveValue<number>;
  templateColumns?: ResponsiveValue<string>;
  autoRows?: ResponsiveValue<string>;
  autoFlow?: ResponsiveValue<CSSProperties['gridAutoFlow']>;
};

type GridItemProps = BoxProps & {
  children: ReactNode;
  span?: ResponsiveValue<number | 'auto' | 'full'>;
  column?: ResponsiveValue<string>;
  row?: ResponsiveValue<string>;
};

const DEFAULT_BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440
};

const BREAKPOINT_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const GridBreakpointContext = createContext<Breakpoint>('xs');

function getActiveBreakpoint(width: number, breakpoints: Record<Breakpoint, number>): Breakpoint {
  let activeBreakpoint: Breakpoint = 'xs';

  for (const breakpoint of BREAKPOINT_ORDER) {
    if (width >= breakpoints[breakpoint]) {
      activeBreakpoint = breakpoint;
    }
  }

  return activeBreakpoint;
}

function isResponsiveObject<T>(value: ResponsiveValue<T>): value is Partial<Record<Breakpoint, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveResponsiveValue<T>(value: ResponsiveValue<T> | undefined, breakpoint: Breakpoint): T | undefined {
  if (value === undefined) return undefined;
  if (!isResponsiveObject(value)) return value;

  let resolvedValue: T | undefined;

  for (const key of BREAKPOINT_ORDER) {
    if (value[key] !== undefined) {
      resolvedValue = value[key];
    }

    if (key === breakpoint) {
      break;
    }
  }

  return resolvedValue;
}

function getGridColumnValue(
  span: ResponsiveValue<number | 'auto' | 'full'> | undefined,
  column: ResponsiveValue<string> | undefined,
  breakpoint: Breakpoint
): string | undefined {
  const resolvedColumn = resolveResponsiveValue(column, breakpoint);

  if (resolvedColumn !== undefined) {
    return resolvedColumn;
  }

  const resolvedSpan = resolveResponsiveValue(span, breakpoint);

  if (resolvedSpan === undefined || resolvedSpan === 'auto') {
    return undefined;
  }

  if (resolvedSpan === 'full') {
    return '1 / -1';
  }

  return `span ${resolvedSpan} / span ${resolvedSpan}`;
}

/**
 * this grid works with container-width-based size
 */
export default function Grid({
  children,
  breakpointValues,
  columns = 12,
  templateColumns,
  autoRows,
  autoFlow,
  sx,
  ...props
}: GridProps): JSX.Element {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  const breakpoints = useMemo<Record<Breakpoint, number>>(
    () => ({
      ...DEFAULT_BREAKPOINTS,
      ...breakpointValues
    }),
    [breakpointValues]
  );

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !gridRef.current) {
      return;
    }

    const node = gridRef.current;
    const resizeObserver = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    resizeObserver.observe(node);
    setWidth(node.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const activeBreakpoint = getActiveBreakpoint(width, breakpoints);
  const resolvedColumns = resolveResponsiveValue(columns, activeBreakpoint) ?? 12;
  const resolvedTemplateColumns = resolveResponsiveValue(templateColumns, activeBreakpoint);
  const resolvedAutoRows = resolveResponsiveValue(autoRows, activeBreakpoint);
  const resolvedAutoFlow = resolveResponsiveValue(autoFlow, activeBreakpoint);

  return (
    <GridBreakpointContext.Provider value={activeBreakpoint}>
      <Box
        ref={gridRef}
        {...props}
        sx={
          [
            {
              display: 'grid',
              gridTemplateColumns: resolvedTemplateColumns ?? `repeat(${resolvedColumns}, minmax(0, 1fr))`,
              gridAutoRows: resolvedAutoRows,
              gridAutoFlow: resolvedAutoFlow
            },
            ...(sx ? [sx] : [])
          ] as SxProps<Theme>
        }
      >
        {children}
      </Box>
    </GridBreakpointContext.Provider>
  );
}

export function GridItem({ children, span, column, row, sx, ...props }: GridItemProps): JSX.Element {
  const activeBreakpoint = useContext(GridBreakpointContext);
  const gridColumn = getGridColumnValue(span, column, activeBreakpoint);
  const gridRow = resolveResponsiveValue(row, activeBreakpoint);

  return (
    <Box
      {...props}
      sx={
        [
          {
            gridColumn,
            gridRow
          },
          ...(sx ? [sx] : [])
        ] as SxProps<Theme>
      }
    >
      {children}
    </Box>
  );
}
