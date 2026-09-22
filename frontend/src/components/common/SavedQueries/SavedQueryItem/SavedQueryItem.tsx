import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useCallback, useState } from 'react';
import type { SavedQueryItemProps } from '../types';
import { SavedQueryItemStyled } from './SavedQueryItem.styled';

export default function SavedQueryItem({
  query,
  selected,
  onChange,
  onClick,
  context,
  isEditMode,
  onEditMode
}: SavedQueryItemProps): JSX.Element {
  const [name, setName] = useState(query.name);

  const addEditorTab = useTabStore((state) => state.addEditorTab);

  const handleRun = useCallback((): void => {
    if (isEditMode) return;
    addEditorTab(query.query);
  }, [isEditMode, addEditorTab, query.query]);

  const { mutateAsync: updateSavedQueryMutation, isPending } = useMutation({
    mutationFn: api.savedQueries.updateSavedQuery
  });

  const handleDiscardChanges = useCallback((): void => {
    onEditMode(false);
    onChange();
  }, [onEditMode, onChange]);

  const handleSaveChange = useCallback(async (): Promise<void> => {
    if (query.name === name || isPending) {
      return;
    }

    try {
      const newQuery = { ...query, name };
      await updateSavedQueryMutation(newQuery);

      onChange();
      onEditMode(false);
    } catch {
      handleDiscardChanges();
    }
  }, [query, name, isPending, updateSavedQueryMutation, onChange, onEditMode, handleDiscardChanges]);

  return (
    <SavedQueryItemStyled
      selected={selected}
      onContextMenu={(e) => {
        context(e);
        onClick();
      }}
    >
      {isEditMode ? (
        <Box
          component='form'
          onSubmit={(e): void => {
            e.preventDefault();
            e.stopPropagation();
            void handleSaveChange();
          }}
          sx={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            minWidth: 0
          }}
        >
          <Box
            sx={{
              flex: 1,
              mr: 1,
              minWidth: 0
            }}
          >
            <FieldInput
              size='small'
              fullWidth={true}
              type='text'
              value={name}
              onChange={(e): void => setName(e.target.value)}
              margin='none'
            />
            <Typography variant='caption' color='textSubdued'>
              {query.createdAt}
            </Typography>
          </Box>
          <IconButton type='button' onClick={handleDiscardChanges}>
            <CustomIcon type='close' size='xs' />
          </IconButton>
          <IconButton type='submit' loading={isPending} disabled={query.name === name || isPending}>
            <CustomIcon type='check' size='xs' />
          </IconButton>
        </Box>
      ) : (
        <>
          <Box
            onDoubleClick={handleRun}
            onClick={(): void => onClick()}
            sx={{
              flex: 1,
              mr: 1
            }}
          >
            <Typography variant='body2'>{query.name}</Typography>
            <Typography variant='caption' color='textSubdued'>
              {query.createdAt}
            </Typography>
          </Box>
          <IconButton
            type='button'
            onClick={(e) => {
              context(e);
              onClick();
            }}
          >
            <CustomIcon type='ellipsisVertical' size='s' />
          </IconButton>
        </>
      )}
    </SavedQueryItemStyled>
  );
}
