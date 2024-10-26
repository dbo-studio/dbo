import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { constants } from '@/core/constants';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { Box, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';

export default function AboutPanel() {
  const version = import.meta.env.VITE_VERSION;

  const theme = useTheme();
  const [about, setAbout] = useState({
    version: version,
    arch: null,
    platform: null,
    platformVersion: null
  });

  useEffect(() => {
    if (tools.isTauri()) {
      setAbout({
        version: version,
        arch: import.meta.env.TAURI_ARCH,
        platform: import.meta.env.TAURI_PLATFORM,
        platformVersion: import.meta.env.TAURI_PLATFORM_VERSION
      });
    }
  }, []);

  return (
    <Box>
      <Box mt={theme.spacing(2)} textAlign={'center'}>
        <img src='/app-icon/icon-512.png' alt='logo' height={100} width={100} />
      </Box>

      {about.version && (
        <Box mt={theme.spacing(2)} textAlign={'center'}>
          <Typography variant='caption'>{locales.version}</Typography>
          <Typography variant='subtitle2'>{about.version}</Typography>
        </Box>
      )}
      {about.platformVersion && (
        <Box mt={theme.spacing(2)} textAlign={'center'}>
          <Typography variant='caption'>{locales.platform_version}</Typography>
          <Typography variant='subtitle2'>{about.platformVersion}</Typography>
        </Box>
      )}
      {about.arch && (
        <Box mt={theme.spacing(2)} textAlign={'center'}>
          <Typography variant='caption'>{locales.architecture}</Typography>
          <Typography variant='subtitle2'>{about.arch}</Typography>
        </Box>
      )}
      {about.platform && (
        <Box mt={theme.spacing(2)} textAlign={'center'}>
          <Typography variant='caption'>{locales.platform}</Typography>
          <Typography variant='subtitle2'>{about.platform}</Typography>
        </Box>
      )}

      <Box mt={theme.spacing(2)} display={'flex'} alignItems={'center'} flexDirection={'column'}>
        <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
          <a href={constants.releasesUrl} target='_blank' rel='noreferrer' style={{ textDecoration: 'none' }}>
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
            style={{ textDecoration: 'none', marginRight: theme.spacing(1) }}
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
