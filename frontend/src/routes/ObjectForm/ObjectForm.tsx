import { useObjectFields } from '@/routes/ObjectForm/hooks/useObjectFields';
import { useObjectTabs } from '@/routes/ObjectForm/hooks/useObjectTabs';
import { ObjectFormStyled } from './ObjectForm.styled';
import ObjectTabs from './ObjectTabs/ObjectTabs';
import TableForm from './TableForm/TableForm';

export default function ObjectForm({ isDetail = false }: { isDetail?: boolean }) {
  const { tabs, selectedTabIndex, currentTabId, handleTabChange } = useObjectTabs();
  const { fields, handleFormChange } = useObjectFields(currentTabId, isDetail);

  const selectedContent = fields ? (
    <TableForm tabId={currentTabId} formSchema={fields} onChange={handleFormChange} />
  ) : null;

  if (!tabs) return null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
