import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TableType } from '@/src/types/Connection';
import { Box, useTheme } from '@mui/material';
import { TreeItem, TreeView } from '@mui/x-tree-view';
import { v4 as uuid } from 'uuid';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function TablesTreeView({ tables }: { tables: TableType[] }) {
  const theme = useTheme();
  const { addTab } = useTabStore();

  const handleTableClick = (tableName: string) => {
    addTab(tableName);
  };

  return (
    <Box mt={1} pb={theme.spacing(7)}>
      <TreeView
        defaultExpanded={['1']}
        aria-label='file system navigator'
        defaultCollapseIcon={<CustomIcon size='s' type={'arrowDown'} />}
        defaultExpandIcon={<CustomIcon size='s' type={'arrowRight'} />}
        defaultEndIcon={<CustomIcon type={'columnToken'} />}
      >
        <TreeItem nodeId='1' label='Tables'>
          {tables.map((table: TableType, index: number) => (
            <TreeItem
              onClick={() => handleTableClick(table.name)}
              key={uuid()}
              nodeId={index + '100'}
              label={table.name}
            />
          ))}
        </TreeItem>
        {/* <TreeItem nodeId='3' label='Functions'>
          <TreeItem nodeId='4' label='OSS' />
        </TreeItem>
        <TreeItem nodeId='5' label='Views'>
          <TreeItem nodeId='6' label='OSS' />
        </TreeItem>
        <TreeItem nodeId='7' label='MaterializeView'>
          <TreeItem nodeId='8' label='OSS' />
        </TreeItem> */}
      </TreeView>
    </Box>
  );
}
