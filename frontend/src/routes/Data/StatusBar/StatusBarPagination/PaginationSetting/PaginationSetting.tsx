import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabDataPagination, TabType } from '@/types';
import { Button, ClickAwayListener, IconButton, Popper } from '@mui/material';
import { type JSX, useState } from 'react';
import { PaginationSettingStyled } from './PaginationSetting.styled';

export default function PaginationSetting(): JSX.Element {
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab();
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

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
    if (!selectedTab || isDataFetching) {
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

    toggleReRunQuery();
  };

  const handleChangeLimit = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const reg = /^[0-9]*$/;
    if (reg.test(e.target.value)) {
      setLimit(Number(e.target.value));
    }
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
              onChange={handleChangeLimit}
              size='small'
              placeholder={locales.limit}
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
