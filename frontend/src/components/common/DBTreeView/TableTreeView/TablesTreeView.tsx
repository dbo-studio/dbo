import TableTreeViewItem from '@/components/common/DBTreeView/TableTreeView/TablesTreeViewItem/TableTreeViewItem';
import useNavigate from '@/hooks/useNavigate.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { v4 as uuid } from 'uuid';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';

export default function TablesTreeView({ tables }: { tables: string[] }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addTab } = useTabStore();
  const { getSelectedTab } = useTabStore();

  const handleTableClick = (tableName: string) => {
    const tab = addTab(tableName);
    navigate({
      route: tab.mode,
      tabId: tab.id
    });
  };

  return (
    <Box mt={1} pb={theme.spacing(7)}>
      <SimpleTreeView
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        selectedItems={[`${getSelectedTab()?.table}100`]}
        slots={{
          expandIcon: () => <CustomIcon size='s' type={'arrowRight'} />,
          collapseIcon: () => <CustomIcon size='s' type={'arrowDown'} />,
          endIcon: () => <CustomIcon type={'sheet'} />
        }}
        autoFocus={false}
        disabledItemsFocusable={true}
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
