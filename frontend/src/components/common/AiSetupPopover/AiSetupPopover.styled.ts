import { Box, styled } from '@mui/material';

export const AiSetupFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  minWidth: 260,
  padding: theme.spacing(1.5)
})) as typeof Box;
