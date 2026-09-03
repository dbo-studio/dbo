import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Box, IconButton } from '@mui/material';
import { Stack } from '@mui/system';
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';
import { SearchBarContainer, SearchMatchCountStyled } from '../DataGrid.styled';
import type { SearchDialogProps } from '../types';

export default function SearchDialog({ open, onClose, search }: SearchDialogProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  const handleClose = (): void => {
    onClose();
    search.clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      search.nextMatch();
    }

    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!open) return <></>;

  return (
    <SearchBarContainer>
      <Stack
        direction='row'
        spacing={1}
        sx={{
          alignItems: 'center',
          alignContent: 'center'
        }}
      >
        <FieldInput
          margin='none'
          inputRef={inputRef}
          placeholder={locales.search}
          value={search.searchTerm}
          onChange={(e): void => search.setSearchTerm(e.target.value)}
          size='small'
          onKeyDown={handleKeyDown}
        />

        <SearchMatchCountStyled variant='caption'>
          {search.matches.length > 0 ? `${search.currentMatchIndex + 1} / ${search.matches.length}` : '0/0'}
        </SearchMatchCountStyled>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5
          }}
        >
          <IconButton
            size='small'
            onClick={search.previousMatch}
            disabled={search.matches.length === 0}
            sx={{ padding: '4px' }}
          >
            <CustomIcon type='arrowUp' size='xs' />
          </IconButton>
          <IconButton
            size='small'
            onClick={search.nextMatch}
            disabled={search.matches.length === 0}
            sx={{ padding: '4px' }}
          >
            <CustomIcon type='arrowDown' size='xs' />
          </IconButton>

          <IconButton size='small' onClick={handleClose} sx={{ padding: '4px' }}>
            <CustomIcon type='close' size='xs' />
          </IconButton>
        </Box>
      </Stack>
    </SearchBarContainer>
  );
}
