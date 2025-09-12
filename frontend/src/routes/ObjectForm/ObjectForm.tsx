import { useObjectTabs } from '@/routes/ObjectForm/hooks/useObjectTabs';
import type { JSX } from 'react';
import { useObjectFields } from './hooks/useObjectFields';
import { ObjectFormStyled } from './ObjectForm.styled';
import ObjectTabs from './ObjectTabs/ObjectTabs';
import TableForm from './TableForm/TableForm';

export default function ObjectForm({ isDetail = false }: { isDetail?: boolean }): JSX.Element {
  const { tabs, selectedTabIndex, handleTabChange } = useObjectTabs();
  const { fields } = useObjectFields(isDetail);

  if (!tabs) return <></>;

  const selectedContent = fields ? <TableForm formSchema={fields} /> : null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
