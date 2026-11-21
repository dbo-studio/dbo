import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { SidebarSectionHeaderStyled } from '@/components/base/SidebarList/SidebarList.styled';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { type JSX, type ReactNode, useState } from 'react';

type BackupSidebarSectionProps = {
  title: string;
  count?: number;
  action?: { label: string; testId: string; onClick: () => void };
  children: ReactNode;
};

export default function BackupSidebarSection({
  title,
  count,
  action,
  children
}: BackupSidebarSectionProps): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <SidebarSectionHeaderStyled role='button' aria-expanded={open} onClick={() => setOpen(!open)}>
        <CustomIcon type={open ? 'chevronDown' : 'chevronRight'} size='xs' />
        <Typography variant='caption' sx={{ flex: 1, fontWeight: 600 }}>
          {count === undefined ? title : `${title} · ${count}`}
        </Typography>
        {action && (
          <Tooltip title={action.label}>
            <IconButton
              aria-label={action.label}
              data-testid={action.testId}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
            >
              <CustomIcon type='plus' size='xs' />
            </IconButton>
          </Tooltip>
        )}
      </SidebarSectionHeaderStyled>
      {open && children}
    </Box>
  );
}