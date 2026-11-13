import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import Modal from '@/components/base/Modal/Modal';
import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { Box, IconButton, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  engine?: { name: string; logo: keyof typeof IconTypes };
  /** The engine picker; omitted when the engine is already fixed (edit, duplicate). */
  rail?: ReactNode;
  /** Pinned above the engine header, e.g. the paste-a-URI bar. */
  top?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

/** Shared frame of New / Edit connection: header on top, optional engine rail, form on the right. */
export default function ConnectionShell({
  open,
  title,
  subtitle,
  engine,
  rail,
  top,
  onClose,
  children
}: Props): JSX.Element {
  return (
    <Modal open={open} size={rail ? 'xl' : 'lg'} padding='0' compact={!rail}>
      <Box
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: rail ? 'min(640px, 88dvh)' : undefined }}
      >
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`
          })}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component='h2' variant='h6' color='textTitle'>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant='caption' color='textSecondary'>
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton aria-label={locales.close} onClick={onClose} data-testid='connection-dialog-close'>
            <CustomIcon type='close' size='s' />
          </IconButton>
        </Box>
        <Box
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            display: 'flex',
            [theme.breakpoints.down('md')]: { flexDirection: 'column' }
          })}
        >
          {rail}
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
            {top}
            {engine && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={(theme) => ({
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: variables.radius.medium,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.background.paper,
                    '& img': { maxWidth: 26, maxHeight: 26 }
                  })}
                >
                  <CustomIcon type={engine.logo} size='l' />
                </Box>
                <Box>
                  <Typography variant='subtitle1' color='textTitle' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {engine.name}
                  </Typography>
                  <Typography variant='caption' color='textSecondary'>
                    {locales.connection_details}
                  </Typography>
                </Box>
              </Box>
            )}
            {children}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
