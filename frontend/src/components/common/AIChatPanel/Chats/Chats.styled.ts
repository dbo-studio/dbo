import { Box, styled } from '@mui/material';

export const ChatsStyled = styled(Box)(() => ({
    display: 'flex',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
        display: 'none'
    },
}));