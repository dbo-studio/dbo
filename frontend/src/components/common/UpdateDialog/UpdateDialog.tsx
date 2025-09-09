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
  const newReleaseVersion = useSettingStore((state) => state.newReleaseVersion);

  useEffect(() => {
    console.log(newReleaseVersion);
    if (newReleaseVersion !== undefined && !newReleaseVersion.ignore) {
      setShow(true);
    }
  }, [newReleaseVersion]);

  const handleOnClose = () => {
    if (newReleaseVersion?.release?.isMinimum) return;
    setShow(false);
  };

  const handleOnIgnore = () => {
    useSettingStore.setState({ newReleaseVersion: { ...newReleaseVersion, ignore: true } });
    setShow(false);
  };

  const handleOnUpdate = () => {
    window.open(newReleaseVersion.release?.url, '_blank');
    if (newReleaseVersion?.release?.isMinimum) return;
    setShow(false);
  };

  if (!newReleaseVersion) {
    return null;
  }

  return (
    <Modal title={locales.new_version_available} open={show} onClose={() => {}}>
      <Box flex={1} display={'flex'} flexDirection={'column'} overflow={'scroll'}>
        <UpdateDialogStyled>
          <Markdown>{newReleaseVersion.release?.body}</Markdown>
        </UpdateDialogStyled>
      </Box>

      <Box display={'flex'} justifyContent={'space-between'}>
        <Stack direction={'row'} spacing={1}>
          <Button
            disabled={newReleaseVersion?.release?.isMinimum}
            onClick={handleOnClose}
            size='small'
            color='info'
            variant='outlined'
          >
            {locales.cancel}
          </Button>
          <Button
            disabled={newReleaseVersion?.release?.isMinimum}
            onClick={handleOnIgnore}
            size='small'
            variant='outlined'
          >
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
