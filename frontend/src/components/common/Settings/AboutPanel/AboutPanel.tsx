import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { constants } from '@/core/constants';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';

export default function AboutPanel(): JSX.Element {
  const theme = useTheme();
  const version = useSettingStore((state) => state.general.version);

  return (
    <Box>
      <Box mt={theme.spacing(2)} textAlign={'center'}>
        <img src='/app-icon/icon-512.png' alt='logo' height={100} width={100} />
      </Box>

      <Box mt={theme.spacing(2)} textAlign={'center'}>
        <Typography variant='caption'>{locales.version}</Typography>
        <Typography variant='subtitle2'>{version}</Typography>
      </Box>

      <Box mt={theme.spacing(2)} display={'flex'} alignItems={'center'} flexDirection={'column'}>
        <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
          <a
            href={constants.releasesUrl}
            target='_blank'
            rel='noreferrer'
            style={{
              textDecoration: 'none',
              color: theme.palette.text.primary
            }}
          >
            <Typography style={{ marginRight: theme.spacing(1) }} variant='caption'>
              {locales.releases_url}
            </Typography>
            <CustomIcon type='externalLink' size='xs' />
          </a>
        </Box>
        <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
          <a
            href={constants.reportIssueUrl}
            target='_blank'
            rel='noreferrer'
            style={{
              textDecoration: 'none',
              marginRight: theme.spacing(1),
              color: theme.palette.text.primary
            }}
          >
            <Typography style={{ marginRight: theme.spacing(1) }} variant='caption'>
              {locales.report_an_issue}
            </Typography>
            <CustomIcon type='externalLink' size='xs' />
          </a>
        </Box>
      </Box>
    </Box>
  );
}
