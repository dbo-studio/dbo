import { useObjectTabs } from '@/routes/ObjectForm/hooks/useObjectTabs';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useObjectFields } from './hooks/useObjectFields';
import { ObjectFormStyled } from './ObjectForm.styled';
import ObjectTabs from './ObjectTabs/ObjectTabs';
import TableForm from './TableForm/TableForm';

export default function ObjectForm({ isDetail }: { isDetail: boolean }): JSX.Element {
  const { tabs, selectedTabIndex, handleTabChange } = useObjectTabs();
  const { fields, isLoading: isLoadingFields } = useObjectFields(isDetail);

  const showTabs = tabs && tabs.length > 0;
  const showContent = !isLoadingFields && fields && fields.length > 0;
  const showLoading = isLoadingFields && showTabs;

  return (
    <ObjectFormStyled>
      {showTabs && <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />}
      {showLoading && (
        <Box display='flex' justifyContent='center' alignItems='center' flex={1} minHeight={200}>
          <CircularProgress size={30} />
        </Box>
      )}
      {showContent && <TableForm formSchema={fields} />}
    </ObjectFormStyled>
  );
}
