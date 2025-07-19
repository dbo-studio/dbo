import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton';
import { useContextMenu } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, ClickAwayListener, IconButton, Typography, useTheme } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import type { SavedQueryItemProps } from '../types';
import SavedQueryContextMenu from './SavedQueryContextMenu/SavedQueryContextMenu';
import { SavedQueryItemStyled } from './SavedQueryItem.styled';

export default function SavedQueryItem({ query, selected, onChange, onClick }: SavedQueryItemProps): JSX.Element {
  const theme = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(query.name);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const addEditorTab = useTabStore.getState().addEditorTab;
  const updateSelectedTab = useTabStore.getState().updateSelectedTab;

  const { mutateAsync: updateSavedQueryMutation, isPending } = useMutation({
    mutationFn: api.savedQueries.updateSavedQuery,
    onError: (error: Error): void => {
      console.error('🚀 ~ updateSavedQueryMutation ~ error:', error);
    }
  });

  const handleEditMode = (edit: boolean): void => {
    setEditMode(edit);
    handleCloseContextMenu();
  };

  const handleSaveChange = async (): Promise<void> => {
    try {
      const newQuery = {
        ...query,
        name
      };
      await updateSavedQueryMutation(newQuery);
      setEditMode(false);
      onChange();
    } catch (err) {
      handleDiscardChanges();
    }
  };

  const handleDiscardChanges = (): void => {
    setName(query.name);
    setEditMode(false);
  };

  const handleRun = (): void => {
    const tab = addEditorTab(query.query);
    updateSelectedTab(tab);
  };

  return (
    <ClickAwayListener onClickAway={handleDiscardChanges}>
      <SavedQueryItemStyled selected={selected} onContextMenu={handleContextMenu}>
        <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={(): void => onClick()}>
          {editMode ? (
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

        {editMode ? (
          <LoadingIconButton loading={isPending} disabled={query.name === name || isPending} onClick={handleSaveChange}>
            <CustomIcon type='check' size='s' />
          </LoadingIconButton>
        ) : (
          <IconButton onClick={handleContextMenu}>
            <CustomIcon type='ellipsisVertical' size='s' />
          </IconButton>
        )}

        <SavedQueryContextMenu
          query={query}
          contextMenu={contextMenuPosition}
          onClose={handleCloseContextMenu}
          onDelete={(): void => onChange()}
          onChange={(): void => handleEditMode(true)}
        />
      </SavedQueryItemStyled>
    </ClickAwayListener>
  );
}
