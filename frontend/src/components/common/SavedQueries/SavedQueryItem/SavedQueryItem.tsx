import api from '@/src/api';
import { TabMode } from '@/src/core/enums';
import useAPI from '@/src/hooks/useApi.hook';
import useContextMenu from '@/src/hooks/useContextMenu';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, ClickAwayListener, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import FieldInput from '../../../base/FieldInput/FieldInput';
import LoadingIconButton from '../../../base/LoadingIconButton/LoadingIconButton';
import { SavedQueryItemProps } from '../types';
import SavedQueryContextMenu from './SavedQueryContextMenu/SavedQueryContextMenu';
import { SavedQueryItemStyled } from './SavedQueryItem.styled';

export default function SavedQueryItem({ query, selected, onChange, onDelete, onClick }: SavedQueryItemProps) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(query.name);
  const theme = useTheme();

  const { addTab } = useTabStore();

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const { request: updateSavedQuery, pending: pendingUpdate } = useAPI({
    apiMethod: api.savedQueries.updateSavedQuery
  });

  const handleEditMode = (edit: boolean) => {
    setEditMode(edit);
    handleCloseContextMenu();
  };

  const handleSaveChange = async () => {
    try {
      const newQuery = {
        ...query,
        name
      };
      setEditMode(false);
      await updateSavedQuery(newQuery);
      onChange(newQuery);
    } catch (err) {
      console.log('🚀 ~ handleSaveChange ~ err:', err);
      handleDiscardChanges();
    }
  };

  const handleDiscardChanges = () => {
    setName(query.name);
    setEditMode(false);
  };

  const handleRun = () => {
    const name = query.name.slice(0, 10);
    addTab(name, TabMode.Query, query.query);
  };

  return (
    <ClickAwayListener onClickAway={handleDiscardChanges}>
      <SavedQueryItemStyled selected={selected} onContextMenu={handleContextMenu}>
        <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={() => onClick()}>
          {editMode ? (
            <FieldInput
              size='small'
              fullWidth={true}
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin='none'
            />
          ) : (
            <Typography variant='body2'>{query.name}</Typography>
          )}
        </Box>

        {editMode && (
          <LoadingIconButton
            loading={pendingUpdate}
            disabled={query.name === name || pendingUpdate}
            onClick={handleSaveChange}
          >
            <CustomIcon type='check' size='s' />
          </LoadingIconButton>
        )}

        <SavedQueryContextMenu
          query={query}
          contextMenu={contextMenuPosition}
          onClose={handleCloseContextMenu}
          onDelete={() => onDelete()}
          onChange={() => handleEditMode(true)}
        />
      </SavedQueryItemStyled>
    </ClickAwayListener>
  );
}
