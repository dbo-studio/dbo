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

  const addEditorTab = useTabStore.getState().addEditorTab;
  const updateSelectedTab = useTabStore.getState().updateSelectedTab;

  const { mutateAsync: updateSavedQueryMutation, isPending } = useMutation({
    mutationFn: api.savedQueries.updateSavedQuery
  });

  const handleDiscardChanges = useCallback((): void => {
    onEditMode(false);
    onChange();
  }, [onEditMode, onChange]);

  const handleSaveChange = useCallback(async (): Promise<void> => {
    try {
      const newQuery = { ...query, name };
      await updateSavedQueryMutation(newQuery);

      onChange();
      onEditMode(false);
    } catch (error) {
      console.debug('🚀 ~ handleSaveChange ~ error:', error);
      handleDiscardChanges();
    }
  }, [query, name, updateSavedQueryMutation, onChange, onEditMode, handleDiscardChanges]);

  const handleRun = useCallback((): void => {
    if (isEditMode) return;
    const tab = addEditorTab(query.query);
    updateSelectedTab(tab);
  }, [isEditMode, addEditorTab, query.query, updateSelectedTab]);

  return (
    <SavedQueryItemStyled
      selected={selected}
      onContextMenu={(e) => {
        context(e);
        onClick();
      }}
    >
      <Box flex={1} mr={1} onDoubleClick={handleRun} onClick={(): void => onClick()}>
        {isEditMode ? (
          <FieldInput
            size='small'
            fullWidth={true}
            type='text'
            value={name}
            onChange={(e): void => setName(e.target.value)}
            margin='none'
          />
        ) : (
          <Typography variant='body2'>{query.name}</Typography>
        )}
      </Box>

      {isEditMode ? (
        <>
          <IconButton onClick={handleDiscardChanges}>
            <CustomIcon type='close' size='xs' />
          </IconButton>
          <IconButton loading={isPending} disabled={query.name === name || isPending} onClick={handleSaveChange}>
            <CustomIcon type='check' size='xs' />
          </IconButton>
        </>
      ) : (
        <IconButton
          onClick={(e) => {
            context(e);
            onClick();
          }}
        >
          <CustomIcon type='ellipsisVertical' size='s' />
        </IconButton>
      )}
    </SavedQueryItemStyled>
  );
}
