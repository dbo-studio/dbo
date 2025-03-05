import api from '@/api';
import {TabMode} from '@/core/enums';
import {useContextMenu} from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import useNavigate from '@/hooks/useNavigate.hook';
import {useTabStore} from '@/store/tabStore/tab.store';
import {Box, ClickAwayListener, IconButton, Typography, useTheme} from '@mui/material';
import {useState} from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import FieldInput from '../../../base/FieldInput/FieldInput';
import LoadingIconButton from '../../../base/LoadingIconButton/LoadingIconButton';
import type {SavedQueryItemProps} from '../types';
import SavedQueryContextMenu from './SavedQueryContextMenu/SavedQueryContextMenu';
import {SavedQueryItemStyled} from './SavedQueryItem.styled';

export default function SavedQueryItem({ query, selected, onChange, onDelete, onClick }: SavedQueryItemProps) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(query.name);
  const theme = useTheme();
  const navigate = useNavigate();

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
      await updateSavedQuery(newQuery);
      setEditMode(false);
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
    const tab = addTab(name, undefined, TabMode.Query, query.query);
    navigate({
      route: tab.mode,
      tabId: tab.id
    });
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

        {editMode ? (
          <LoadingIconButton
            loading={+pendingUpdate}
            disabled={query.name === name || pendingUpdate}
            onClick={handleSaveChange}
          >
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
          onDelete={() => onDelete()}
          onChange={() => handleEditMode(true)}
        />
      </SavedQueryItemStyled>
    </ClickAwayListener>
  );
}
