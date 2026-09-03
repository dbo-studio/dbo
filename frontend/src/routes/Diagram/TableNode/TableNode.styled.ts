import { variables } from '@/core/theme/variables';
import { alpha, Box, styled, Typography } from '@mui/material';

type AccentProps = {
  accent: string;
};

type CardProps = AccentProps & {
  highlighted: boolean;
  dimmed: boolean;
};

type AccentBarProps = AccentProps & {
  highlighted: boolean;
};

type ColumnRowProps = {
  removed: boolean;
  striped: boolean;
};

type ColumnNameProps = {
  primary: boolean;
};

type KeyBadgeProps = {
  badgeColor: string;
};

export const TableNodeCardStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'accent' && prop !== 'highlighted' && prop !== 'dimmed'
})<CardProps>(({ theme, accent, highlighted, dimmed }) => {
  const isDark = theme.palette.mode === 'dark';

  return {
    width: 280,
    borderRadius: variables.radius.medium,
    border: `1px solid ${highlighted ? accent : theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    opacity: dimmed ? 0.4 : 1,
    boxShadow: highlighted
      ? `0 0 0 1px ${alpha(accent, 0.3)}, 0 4px 12px ${alpha(theme.palette.common.black, isDark ? 0.35 : 0.1)}`
      : `0 1px 2px ${alpha(theme.palette.common.black, isDark ? 0.35 : 0.06)}`,
    overflow: 'hidden',
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing'
    }
  };
});

export const AccentBarStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'accent' && prop !== 'highlighted'
})<AccentBarProps>(({ theme, accent, highlighted }) => ({
  height: 3,
  backgroundColor: highlighted ? accent : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.45 : 0.55)
}));

export const HeaderStyled = styled(Box)(({ theme }) => ({
  padding: `${theme.spacing(0.85)} ${theme.spacing(1.25)}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.55 : 0.85),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75)
}));

export const HeaderIconStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'accent'
})<AccentProps>(({ accent }) => ({
  width: 22,
  height: 22,
  borderRadius: variables.radius.small,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  backgroundColor: alpha(accent, 0.12),
  color: accent
}));

export const HeaderTextStyled = styled(Box)({
  minWidth: 0,
  flex: 1,
  userSelect: 'none'
});

export const TableNameStyled = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.25,
  color: theme.palette.textTitle
}));

export const SchemaNameStyled = styled(Typography)(({ theme }) => ({
  display: 'block',
  fontSize: 10,
  lineHeight: 1.2,
  color: theme.palette.textSubdued
}));

export const ColumnsStyled = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(0.25),
  paddingBottom: theme.spacing(0.25)
}));

export const EmptyColumnsStyled = styled(Typography)(({ theme }) => ({
  display: 'block',
  padding: `${theme.spacing(0.75)} ${theme.spacing(1.25)}`,
  color: theme.palette.textSubdued
}));

export const ColumnRowStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'removed' && prop !== 'striped'
})<ColumnRowProps>(({ theme, removed, striped }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: `${theme.spacing(0.4)} ${theme.spacing(1.25)}`,
  minHeight: 26,
  opacity: removed ? 0.45 : 1,
  textDecoration: removed ? 'line-through' : 'none',
  backgroundColor: striped
    ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02)
    : 'transparent'
}));

export const ColumnKeyIconStyled = styled(Box)({
  width: 14,
  display: 'flex',
  justifyContent: 'center',
  flexShrink: 0
});

export const ColumnNameStyled = styled(Typography, {
  shouldForwardProp: (prop): boolean => prop !== 'primary'
})<ColumnNameProps>(({ theme, primary }) => ({
  flex: 1,
  minWidth: 0,
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 11.5,
  fontWeight: primary ? 600 : 400,
  color: theme.palette.text.text,
  userSelect: 'text',
  cursor: 'text'
}));

export const ColumnMetaStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.4),
  flexShrink: 0,
  maxWidth: 118
}));

export const ColumnTypeStyled = styled(Typography)(({ theme }) => ({
  maxWidth: 72,
  fontSize: 10.5,
  color: theme.palette.textSubdued,
  userSelect: 'text',
  cursor: 'text'
}));

export const KeyBadgeStyled = styled(Box, {
  shouldForwardProp: (prop): boolean => prop !== 'badgeColor'
})<KeyBadgeProps>(({ badgeColor }) => ({
  display: 'inline-flex',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.4,
  lineHeight: 1,
  padding: '2px 4px',
  borderRadius: variables.radius.small,
  color: badgeColor,
  backgroundColor: alpha(badgeColor, 0.14),
  border: `1px solid ${alpha(badgeColor, 0.28)}`,
  flexShrink: 0
}));
