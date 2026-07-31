import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { TabMode } from '@/core/enums';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, EditorTabType, TabDataPagination, TabType } from '@/types';
import { Button, ClickAwayListener, IconButton, Popper } from '@mui/material';
import { type JSX, useState } from 'react';
import { PaginationSettingStyled } from './PaginationSetting.styled';

export default function PaginationSetting(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab();
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const currentLimit =
    (selectedTab as DataTabType | EditorTabType | undefined)?.pagination?.limit ?? 100;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [limit, setLimit] = useState<number>(currentLimit);
  const [errors, setErrors] = useState<{
    limit: string | undefined;
  }>({
    limit: undefined
  });

  const open = Boolean(anchorEl);
  const id = open ? 'PaginationSetting' : undefined;

  const handleOpenClick = (event: React.MouseEvent<HTMLElement>): void => {
    setLimit(currentLimit);
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleCloseClick = (): void => {
    setLimit(currentLimit);
    setErrors({
      limit: undefined
    });
    setAnchorEl(null);
  };

  const handleUpdateState = (): void => {
    if (!selectedTab || isDataFetching) {
      return;
    }

    if (limit < 1) {
      setErrors({
        limit: locales.limit_should_greater_than_zero
      });
      return;
    }

    const pagination: TabDataPagination = {
      page: (selectedTab as DataTabType | EditorTabType).pagination?.page ?? 1,
      limit
    };

    updateSelectedTab({
      ...(selectedTab as TabType),
      pagination
    } as TabType);

    setAnchorEl(null);

    if (selectedTab.mode === TabMode.Query) {
      void runRawQuery();
      return;
    }

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

      <Popper id={id} open={open} anchorEl={anchorEl} placement={isMobile ? 'top-end' : 'bottom-end'}>
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
