import DBTreeView from '@/src/components/common/DBTreeView/DBTreeView';
import styled from '@emotion/styled';
import { Box, Tab, Tabs, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';

const tabs = [
  {
    id: 0,
    name: 'Items',
    content: (
      <>
        <DBTreeView />
      </>
    )
  },
  {
    id: 1,
    name: 'Queries',
    content: (
      <>
        <p>Queries</p>
      </>
    )
  },
  {
    id: 2,
    name: 'History',
    content: (
      <>
        <p>History</p>
      </>
    )
  }
];

export default function ExplorerContainer() {
  const theme = useTheme();
  const [selectedTabId, setSelectedTabId] = useState(0);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  const ExplorerContainerStyle = styled(Box)({
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    height: '100vh',
    overflow: 'auto'
  });

  return (
    <ResizableXBox width={285} direction='rtl' maxWidth={500}>
      <ExplorerContainerStyle>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label='Tables' />
          <Tab label='Queries' />
          <Tab label='History' />
        </Tabs>

        <Box role='tabpanel'>{selectedTabContent}</Box>
      </ExplorerContainerStyle>
    </ResizableXBox>
  );
}
