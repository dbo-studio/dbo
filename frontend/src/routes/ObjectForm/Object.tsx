import api from '@/api';
import TableForm from '@/components/TableForm/TableForm';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ObjectStyled } from './Object.styled';
import ObjectTabs from './ObjectTabs';

export default function ObjectForm() {
  const { currentConnection } = useConnectionStore();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // Get tabs list
  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', currentConnection?.id],
    queryFn: () =>
      api.tree.getTabs({
        nodeId: 'default.public.data_src',
        action: 'createTable',
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection
  });

  // Get fields for selected tab
  const { data: fields } = useQuery({
    queryKey: ['tabFields', currentConnection?.id, tabs?.[selectedTabIndex]?.id],
    queryFn: () =>
      api.tree.getFields({
        nodeId: 'default.public.data_src',
        action: 'createTable',
        tabId: tabs?.[selectedTabIndex].id || '',
        connectionId: String(currentConnection?.id || ''),
        type: 'table'
      }),
    enabled: !!currentConnection && !!tabs?.[selectedTabIndex]
  });

  const handleFormChange = (data: any) => {
    console.log('Form data changed:', data);
  };

  const selectedContent = useMemo(() => {
    if (!fields) return null;

    return <TableForm formSchema={fields} onChange={handleFormChange} />;
  }, [fields]);

  if (!tabs) return null;

  return (
    <ObjectStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={setSelectedTabIndex} />
      {selectedContent}
    </ObjectStyled>
  );
}
