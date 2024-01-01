import { useUUID } from '@/src/hooks';
import { useConnectionStore } from '@/src/store/tabStore/connection.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TableType } from '@/src/types/Connection';
import { Box } from '@mui/material';
import { TreeItem, TreeView } from '@mui/x-tree-view';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function TablesTreeView() {
  const { currentSchema } = useConnectionStore();
  const { addTab } = useTabStore();
  const uuids = useUUID(currentSchema.tables.length);

  const handleTableClick = (tableName: string) => {
    addTab(tableName);
  };

  return (
    <Box mt={1}>
      <TreeView
        defaultExpanded={['1']}
        aria-label='file system navigator'
        defaultCollapseIcon={<CustomIcon width={10} height={13} type={'arrowDown'} />}
        defaultExpandIcon={<CustomIcon width={10} height={13} type={'arrowRight'} />}
        defaultEndIcon={<CustomIcon type={'columnToken'} />}
      >
        <TreeItem nodeId='1' label='Tables'>
          {currentSchema.tables.map((table: TableType, index: number) => (
            <TreeItem
              onClick={() => handleTableClick(table.name)}
              key={uuids[index]}
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
