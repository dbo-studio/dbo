import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabDataPagination, TabType } from '@/types';
import { Button, ClickAwayListener, IconButton, Popper } from '@mui/material';
import { useState } from 'react';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import FieldInput from '../../../../base/FieldInput/FieldInput';
import { PaginationSettingStyled } from './PaginationSetting.styled';

export default function PaginationSetting() {
  const { updateSelectedTab, getSelectedTab } = useTabStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [limit, setLimit] = useState<number>(getSelectedTab()?.pagination?.limit ?? 0);
  const [offset, setOffset] = useState<number>(getSelectedTab()?.pagination?.offset ?? 0);
  const [errors, setErrors] = useState<{
    limit: string | undefined;
    offset: string | undefined;
  }>({
    limit: undefined,
    offset: undefined
  });

  const open = Boolean(anchorEl);
  const id = open ? 'PaginationSetting' : undefined;

  const handleOpenClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleCloseClick = () => {
    setLimit(getSelectedTab()?.pagination.limit ?? 0);
    setOffset(getSelectedTab()?.pagination.offset ?? 0);
    setErrors({
      limit: undefined,
      offset: undefined
    });
    setAnchorEl(null);
  };

  const handleUpdateState = () => {
    if (!getSelectedTab()) {
      return;
    }

    if (limit < 0) {
      setErrors({
        limit: locales.limit_should_greater_than_zero,
        offset: undefined
      });
    }

    if (offset < 0) {
      setErrors({
        limit: undefined,
        offset: locales.offset_should_greater_than_zero
      });
    }

    const pagination: TabDataPagination = {
      page: getSelectedTab()?.pagination.page ?? 1,
      limit,
      offset
    };

    updateSelectedTab({
      ...(getSelectedTab() ?? ({} as TabType)),
      pagination
    });

    setAnchorEl(null);
  };

  return (
    <>
      <IconButton aria-describedby={id} onClick={handleOpenClick}>
        <CustomIcon type='settings' size='s' />
      </IconButton>

      <Popper id={id} open={open} anchorEl={anchorEl}>
        <ClickAwayListener onClickAway={handleCloseClick}>
          <PaginationSettingStyled>
            <FieldInput
              error={!!errors.limit}
              helpertext={errors.limit}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              size='small'
              placeholder={locales.limit}
              type='number'
              label={locales.limit}
            />
            <FieldInput
              error={!!errors.offset}
              helpertext={errors.offset}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              size='small'
              placeholder={locales.offset}
              type='number'
              label={locales.offset}
            />
            <Button variant='contained' onClick={handleUpdateState} size='small' fullWidth>
              {locales.save}
            </Button>
          </PaginationSettingStyled>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
