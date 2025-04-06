import { useObjectFields } from '@/routes/ObjectForm/hooks/useObjectFields';
import { useObjectTabs } from '@/routes/ObjectForm/hooks/useObjectTabs';
import type { JSX } from 'react';
import { ObjectFormStyled } from './ObjectForm.styled';
import ObjectTabs from './ObjectTabs/ObjectTabs';
import TableForm from './TableForm/TableForm';

export default function ObjectForm({ isDetail = false }: { isDetail?: boolean }): JSX.Element {
  const { tabs, selectedTabIndex, currentTabId, handleTabChange } = useObjectTabs();
  const { fields } = useObjectFields(currentTabId, isDetail);

  if (!tabs) return <></>;

  const selectedContent = fields ? <TableForm tabId={currentTabId} formSchema={fields} /> : null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
