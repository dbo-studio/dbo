import Modal from '@/components/base/Modal/Modal';
import { useUUID } from '@/hooks';
import { Box, Grid } from '@mui/material';
import { useMemo, useState } from 'react';
import SettingTabItem from './SettingTabItem/SettingTabItem';

const tabs: {
  id: number;
  name: string;
  icon: string;
  content: JSX.Element;
}[] = [
  {
    id: 0,
    name: 'Tab 1',
    icon: '',
    content: <div>Tab 1 content</div>
  }
];

export default function Settings({ open }: { open: boolean }) {
  const uuids = useUUID(4);
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  return (
    <Modal open={open} padding='0px'>
      <Grid container spacing={0}>
        <Grid>
          <Box>
            {tabs.map((tab, index) => (
              <SettingTabItem onClick={() => setSelectedTabId(tab.id)} key={uuids[index]} tab={tab} />
            ))}
          </Box>
        </Grid>
        <Grid flex={1}>{selectedTabContent}</Grid>
      </Grid>
    </Modal>
  );
}
