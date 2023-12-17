import { useAppStore } from '@/src/store/zustand';
import { Box } from '@mui/material';
import dynamic from 'next/dynamic';
import ActionBar from '../ActionBar/ActionBar';

const DynamicQueryPreview = dynamic(() => import('../QueryPreview/QueryPreview'), {
  loading: () => null
});
const DynamicDBDataGrid = dynamic(() => import('../DBDataGrid/DBDataGrid'), {
  loading: () => null
});
const DynamicStatusBar = dynamic(() => import('../StatusBar/StatusBar'), {
  loading: () => null
});

export default function TabPanel() {
  const { selectedTab } = useAppStore();
  return (
    <Box position='relative' height='calc(100% - 100px)'>
      <ActionBar />
      {selectedTab!.showQuery && <DynamicQueryPreview />}
      <DynamicDBDataGrid />
      <DynamicStatusBar />
    </Box>
  );
}
