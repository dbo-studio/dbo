import Modal from '@/components/base/Modal/Modal';
import { Grid } from '@mui/material';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MenuPanel from './MenuPanel/MenuPanel';

export default function Settings({ open }: { open: boolean }) {
  const [content, setContent] = useState<JSX.Element>();
  const [searchParams, setSearchParams] = useSearchParams();

  function handleOnClose(): void {
    setSearchParams({
      ...searchParams,
      showSettings: 'false'
    });
  }

  return (
    <Modal open={open} padding='0px' onClose={handleOnClose}>
      <Grid container spacing={0} flex={1}>
        <Grid display={'flex'} flexDirection={'column'}>
          <MenuPanel onChange={(c) => setContent(c)} />
        </Grid>
        <Grid flex={1}>{content}</Grid>
      </Grid>
    </Modal>
  );
}
