import { variables } from '@/core/theme/variables';
import { alpha, Box, styled, Typography } from '@mui/material';

export const ChartEmptyText = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'block'
}));

export const ChartMetricRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2)
}));

export const ChartMetricValue = styled(Typography)(({ theme }) => ({
  ...theme.typography.h4,
  fontWeight: 600,
  lineHeight: 1.2
}));

export const ChartPlotRoot = styled(Box)({});

export const ChartPlotFrame = styled(Box)<{ $height: number }>(({ $height }) => ({
  height: $height
}));

export const ChartHeatmapRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflow: 'auto'
}));

export const ChartHeatmapGrid = styled(Box)<{ $columnCount: number }>(({ theme, $columnCount }) => ({
  display: 'grid',
  gridTemplateColumns: `minmax(80px, auto) repeat(${$columnCount}, minmax(48px, 1fr))`,
  gap: '2px',
  fontSize: theme.typography.caption.fontSize
}));

export const ChartHeatmapCell = styled(Box)<{ $shade: number; $finite: boolean }>(({ theme, $shade, $finite }) => ({
  minHeight: 28,
  borderRadius: variables.radius.small,
  display: 'grid',
  placeItems: 'center',
  backgroundColor: $finite ? alpha(theme.palette.primary.main, $shade) : theme.palette.action.hover,
  color: $finite && $shade > 0.55 ? theme.palette.primary.contrastText : theme.palette.text.primary
}));

export const ChartHeatmapHeaderCell = styled(Typography)({
  textAlign: 'center'
});
