import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabDataPagination, TabType } from '@/types';
import { Button, ClickAwayListener, IconButton, Popper } from '@mui/material';
import { type JSX, useState } from 'react';

import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { PaginationSettingStyled } from './PaginationSetting.styled';

export default function PaginationSetting(): JSX.Element {
  const { updateSelectedTab } = useTabStore();
  const selectedTab = useSelectedTab();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [limit, setLimit] = useState<number>(selectedTab?.pagination?.limit ?? 0);
  const [errors, setErrors] = useState<{
    limit: string | undefined;
  }>({
    limit: undefined
  });

  const open = Boolean(anchorEl);
  const id = open ? 'PaginationSetting' : undefined;

  const handleOpenClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleCloseClick = (): void => {
    setLimit(selectedTab?.pagination?.limit ?? 0);
    setErrors({
      limit: undefined
    });
    setAnchorEl(null);
  };

  const handleUpdateState = (): void => {
    if (!selectedTab) {
      return;
    }

    if (limit < 0) {
      setErrors({
        limit: locales.limit_should_greater_than_zero
      });
    }

    const pagination: TabDataPagination = {
      page: selectedTab?.pagination?.page ?? 1,
      limit
    };

    updateSelectedTab({
      ...(selectedTab ?? ({} as TabType)),
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setLimit(Number(e.target.value))}
              size='small'
              placeholder={locales.limit}
              type='number'
              label={locales.limit}
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
