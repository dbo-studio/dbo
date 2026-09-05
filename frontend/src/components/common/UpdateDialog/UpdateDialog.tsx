import Modal from '@/components/base/Modal/Modal';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Button } from '@mui/material';
import { Stack } from '@mui/system';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { UpdateDialogContentStyled, UpdateDialogStyled } from './UpdateDialog.styled';

export default function UpdateDialog() {
  const release = useSettingStore((state) => state.general.release);
  const ignoredRelease = useSettingStore((state) => state.general.ignoredRelease);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  const isReleasePrompt = Boolean(release && release.name !== ignoredRelease);
  const [dismissedReleaseName, setDismissedReleaseName] = useState<string | null>(null);
  const show = isReleasePrompt && dismissedReleaseName !== release?.name;

  const handleOnClose = () => {
    if (release?.isMinimum) return;
    setDismissedReleaseName(release?.name ?? null);
  };

  const handleOnIgnore = () => {
    if (release === undefined) return;

    updateGeneral({ ignoredRelease: release.name });
    setDismissedReleaseName(release.name);
  };

  const handleOnUpdate = async () => {
    if (release === undefined) return;
    if (await tools.isTauri()) {
      await openUrl(release.url);
    } else {
      window.open(release.url, '_blank');
    }
    setDismissedReleaseName(release.name);
  };

  if (!release) {
    return null;
  }

  return (
    <Modal title={locales.new_version_available} open={show} onClose={() => {}}>
      <UpdateDialogContentStyled>
        <UpdateDialogStyled>
          <Markdown>{release.body}</Markdown>
        </UpdateDialogStyled>
      </UpdateDialogContentStyled>
      <Box
        sx={{
          display: 'flex',
          flexShrink: 0,
          justifyContent: 'space-between'
        }}
      >
        <Stack direction={'row'} spacing={1}>
          <Button disabled={release.isMinimum} onClick={handleOnClose} size='small' color='info' variant='outlined'>
            {locales.cancel}
          </Button>
          <Button disabled={release.isMinimum} onClick={handleOnIgnore} size='small' variant='outlined'>
            {locales.ignore_this_update}
          </Button>
        </Stack>

        <Button size='small' color='primary' variant='contained' onClick={() => void handleOnUpdate()}>
          {locales.update}
        </Button>
      </Box>
    </Modal>
  );
}
