import PanelItem from '@/components/common/Panels/PanelItem/PanelItem.tsx';
import PanelTabs from '@/components/common/Panels/PanelTabs/PanelTabs.tsx';

export default function Panels() {
  //   return (
  //     currentTabId && (
  //       <>
  //         <Tabs
  //           value={currentTabId}
  //           onChange={(_: React.SyntheticEvent, tabId: string) => handleSwitchTab(tabId)}
  //           variant='scrollable'
  //           scrollButtons={false}
  //         >
  //           {getTabs()?.map((tab: TabData) => (
  //             <Tab
  //               onContextMenu={handleContextMenu}
  //               key={tab.id}
  //               value={tab.id}
  //               className='Mui-flat grid-tab'
  //               label={
  //                 <Box display={'flex'} alignItems={'center'}>
  //                   <Tooltip title={tab.table} placement={'bottom'} key={tab.id}>
  //                     <Typography
  //                       display={'inline-block'}
  //                       component={'span'}
  //                       overflow={'hidden'}
  //                       textOverflow={'ellipsis'}
  //                       maxWidth={'100px'}
  //                       variant='subtitle2'
  //                     >
  //                       {tab.table}
  //                     </Typography>
  //                   </Tooltip>
  //                   <CustomIcon
  //                     type='close'
  //                     size='s'
  //                     onClick={(e) => {
  //                       e.stopPropagation();
  //                       handleRemoveTab(tab.id);
  //                     }}
  //                   />
  //                 </Box>
  //               }
  //             />
  //           ))}
  //           <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
  //         </Tabs>
  //         <PanelItem />
  //       </>
  //     )
  //   );

  return (
    <>
      <PanelTabs />
      <PanelItem />
    </>
  );
}
