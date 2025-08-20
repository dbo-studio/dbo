import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const DatabaseSchemaStyled = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: variables.radius.medium,
    padding: `${theme.spacing(1 / 2)} ${theme.spacing(1)}`,
    border: `1px solid ${theme.palette.divider}`
}));