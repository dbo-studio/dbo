import TableTreeViewItem from '@/components/common/DBTreeView/TableTreeView/TablesTreeViewItem/TableTreeViewItem';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { v4 as uuid } from 'uuid';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';

export default function TablesTreeView({ tables }: { tables: string[] }) {
  const theme = useTheme();
  const { addTab, selectedTab } = useTabStore();

  const handleTableClick = (tableName: string) => {
    addTab(tableName);
  };

  return (
    <Box mt={1} pb={theme.spacing(7)}>
      <SimpleTreeView
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        selectedItems={[selectedTab?.table + '100']}
        autoFocus={false}
        disabledItemsFocusable={true}
        slots={{
          expandIcon: () => <CustomIcon size='s' type={'arrowRight'} />,
          collapseIcon: () => <CustomIcon size='s' type={'arrowDown'} />,
          endIcon: () => <CustomIcon type={'sheet'} />
        }}
        defaultExpandedItems={['1']}
        aria-label='file system navigator'
      >
        <TreeItem label={locales.tables} itemId={'1'}>
          {tables.map((table: string) => (
            <TableTreeViewItem table={table} key={uuid()} onClick={() => handleTableClick(table)} />
          ))}
          <TreeItem style={{ display: 'none' }} itemId={'100'} />
        </TreeItem>
      </SimpleTreeView>
    </Box>
  );
}
