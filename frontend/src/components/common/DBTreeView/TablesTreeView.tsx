import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { v4 as uuid } from 'uuid';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function TablesTreeView({ tables }: { tables: string[] }) {
  const theme = useTheme();
  const { addTab } = useTabStore();

  const handleTableClick = (tableName: string) => {
    addTab(tableName);
  };

  return (
    <Box mt={1} pb={theme.spacing(7)}>
      <SimpleTreeView
        slots={{
          expandIcon: () => <CustomIcon size='s' type={'arrowRight'} />,
          collapseIcon: () => <CustomIcon size='s' type={'arrowDown'} />,
          endIcon: () => <CustomIcon type={'columnToken'} />
        }}
        defaultExpandedItems={['1']}
        aria-label='file system navigator'
      >
        <TreeItem label='Tables' itemId={'1'}>
          {tables.map((table: string, index: number) => (
            <TreeItem onClick={() => handleTableClick(table)} key={uuid()} itemId={index + '100'} label={table} />
          ))}
          <TreeItem style={{ display: 'none' }} itemId={'100'} />
        </TreeItem>
      </SimpleTreeView>
    </Box>
  );
}
