import { Box, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const BackupRootStyled = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  minHeight: 0,
  width: '100%',
  overflow: 'hidden',
  background: theme.palette.background.default,
  [theme.breakpoints.down('md')]: { flexDirection: 'column' }
}));

export const BackupContentPaneStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(2)
}));

export const BackupContentInnerStyled = styled(Box)(({ theme }) => ({
  maxWidth: 880,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

export const SectionHeadStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexWrap: 'wrap'
}));

export const SectionActionsStyled = styled(Box)(({ theme }) => ({
  marginLeft: 'auto',
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center'
}));

/** A list of rows: flat, hairline dividers, like the settings lists. No card, no rounding. */
export const CardStyled = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const CardRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const CardRowMainStyled = styled(Box)({
  flex: 1,
  minWidth: 0
});

/** A row's leading icon: plain, in the muted text colour. */
export const CardRowIconStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  color: theme.palette.text.secondary
}));

export const FieldGridStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' }
}));

export const LogStyled = styled('pre')(({ theme }) => ({
  margin: 0,
  padding: theme.spacing(1),
  whiteSpace: 'pre-wrap',
  fontFamily: theme.editorFontFamily,
  fontSize: variables.fontSize.sm,
  background: theme.palette.action.hover,
  borderRadius: variables.radius.small
}));

/** A titled group of form rows (see SettingGroup / SettingRow). */
export const FormCardStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}));

/** The control side of a form row: a fixed width so labels and controls line up down the page. */
export const RowControlStyled = styled(Box)({
  width: 280,
  maxWidth: '100%'
});

export const FormActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1)
}));
