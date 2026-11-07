import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { variables } from '@/core/theme/variables';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { Box, Button, ClickAwayListener, IconButton, Popper, styled, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';

const SettingStyled = styled(Box)(({ theme }) => ({
  background: theme.palette.background.subdued,
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1)
})) as typeof Box;

type Props = {
  page: number;
  limit: number;
  disabled?: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onLimit: (limit: number) => void;
};

/** Page size (gear), previous / next and the page number: the right side of every grid status bar. */
export default function PaginationControls({ page, limit, disabled, canNext, onPrev, onNext, onLimit }: Props): JSX.Element {
  const { isMobile } = useLayoutMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(limit);
  const [error, setError] = useState<string | undefined>();

  const close = (): void => {
    setDraft(limit);
    setError(undefined);
    setAnchor(null);
  };

  const submit = (): void => {
    if (draft < 1) {
      setError(locales.limit_should_greater_than_zero);
      return;
    }
    setAnchor(null);
    onLimit(draft);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'flex-end', width: isMobile ? 'auto' : 208 }}>
      <IconButton
        aria-label={locales.limit}
        data-testid='pagination-settings'
        onClick={(e): void => {
          setDraft(limit);
          setAnchor(anchor ? null : e.currentTarget);
        }}
      >
        <CustomIcon type='settings' size='s' />
      </IconButton>
      <Popper open={!!anchor} anchorEl={anchor} placement={isMobile ? 'top-end' : 'bottom-end'}>
        <ClickAwayListener onClickAway={close}>
          <SettingStyled
            component='form'
            onSubmit={(e: React.FormEvent): void => {
              e.preventDefault();
              e.stopPropagation();
              submit();
            }}
          >
            <FieldInput
              error={!!error}
              helpertext={error}
              value={draft}
              onChange={(e): void => {
                if (/^[0-9]*$/.test(e.target.value)) setDraft(Number(e.target.value));
              }}
              size='small'
              placeholder={locales.limit}
              label={locales.limit}
            />
            <Button type='submit' variant='contained' size='small' fullWidth>
              {locales.save}
            </Button>
          </SettingStyled>
        </ClickAwayListener>
      </Popper>
      <Tooltip title={locales.previous_page}>
        <span>
          <IconButton aria-label={locales.previous_page} disabled={page === 1 || disabled} onClick={onPrev}>
            <CustomIcon type='chevronLeft' size='s' />
          </IconButton>
        </span>
      </Tooltip>
      <Typography color='textText' sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: isMobile ? 28 : 54, lineHeight: 1 }}>
        {page}
      </Typography>
      <Tooltip title={locales.next_page}>
        <span>
          <IconButton aria-label={locales.next_page} disabled={!canNext || disabled} onClick={onNext}>
            <CustomIcon type='chevronRight' size='s' />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
