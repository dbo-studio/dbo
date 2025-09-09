import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Button } from '@mui/material';
import { Stack } from '@mui/system';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { UpdateDialogStyled } from './UpdateDialog.styled';

export default function UpdateDialog() {
  const [show, setShow] = useState(false);
  const release = useSettingStore((state) => state.general.release);
  const ignoredRelease = useSettingStore((state) => state.ignoredRelease);
  const updateIgnoredRelease = useSettingStore((state) => state.updateIgnoredRelease);

  useEffect(() => {
    if (release && release.name !== ignoredRelease) {
      setShow(true);
    }
  }, [release]);

  const handleOnClose = () => {
    if (release?.isMinimum) return;
    setShow(false);
  };

  const handleOnIgnore = () => {
    if (release === undefined) return;

    updateIgnoredRelease(release?.name);
    setShow(false);
  };

  const handleOnUpdate = () => {
    if (release === undefined) return;
    window.open(release?.url, '_blank');
    setShow(false);
  };

  if (!release) {
    return null;
  }

  return (
    <Modal title={locales.new_version_available} open={show} onClose={() => {}}>
      <Box flex={1} display={'flex'} flexDirection={'column'} overflow={'scroll'}>
        <UpdateDialogStyled>
          <Markdown>{release.body}</Markdown>
        </UpdateDialogStyled>
      </Box>

      <Box display={'flex'} justifyContent={'space-between'}>
        <Stack direction={'row'} spacing={1}>
          <Button disabled={release.isMinimum} onClick={handleOnClose} size='small' color='info' variant='outlined'>
            {locales.cancel}
          </Button>
          <Button disabled={release.isMinimum} onClick={handleOnIgnore} size='small' variant='outlined'>
            {locales.ignore_this_update}
          </Button>
        </Stack>

        <Button size='small' color='primary' variant='contained' onClick={handleOnUpdate}>
          {locales.update}
        </Button>
      </Box>
    </Modal>
  );
}
