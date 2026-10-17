import { Box, styled } from '@mui/material';

/** Modal action row: right-aligned, text-button cancel then contained primary. Use `spread` when a left-side action (e.g. Test) shares the row. */
const ModalFooter = styled(Box, { shouldForwardProp: (prop) => prop !== 'spread' })<{ spread?: boolean }>(
  ({ theme, spread }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: spread ? 'space-between' : 'flex-end',
    gap: theme.spacing(1),
    flexShrink: 0,
    marginTop: theme.spacing(2)
  })
);

export default ModalFooter;
