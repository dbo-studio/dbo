import api from '@/api';
import TableForm from '@/components/TableForm/TableForm';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ObjectFormStyled } from './ObjectForm.styled';
import ObjectTabs from './ObjectTabs';

export default function ObjectForm({ isDetail = false }: { isDetail?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTabIndex, setSelectedTabIndex] = useState(() => {
    const tabIndex = searchParams.get('tab');
    return tabIndex ? Number.parseInt(tabIndex) : 0;
  });
  const [formDataByTab, setFormDataByTab] = useState<Record<string, any>>({});
  const { currentConnection } = useConnectionStore();
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action],
    queryFn: () =>
      api.tree.getTabs({
        nodeId: selectedTab?.id ?? '',
        action: selectedTab?.options?.action,
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection
  });

  const currentTabId = tabs?.[selectedTabIndex]?.id;

  const { data: fields } = useQuery({
    queryKey: ['tabFields', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, currentTabId],
    queryFn: () =>
      isDetail
        ? api.tree.getObject({
            nodeId: selectedTab?.id ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: String(currentConnection?.id || '')
          })
        : api.tree.getFields({
            nodeId: selectedTab?.id ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: String(currentConnection?.id || '')
          }),
    enabled: !!currentConnection && !!currentTabId
  });

  const handleFormChange = (data: any) => {
    console.log('🚀 ~ handleFormChange ~ data:', data);
    if (!currentTabId || !fields) return;

    const updatedFields = fields.map((field) => {
      if (field.type === 'array') {
        return {
          ...field,
          fields: data[field.id]
        };
      }
      return {
        ...field,
        value: data[field.id]
      };
    });

    setFormDataByTab((prev) => ({
      ...prev,
      [currentTabId]: updatedFields
    }));
  };

  const selectedContent = useMemo(() => {
    if (!fields || !currentTabId) return null;

    const currentFields = isDetail ? formDataByTab[currentTabId] || fields : fields;
    console.log('🚀 ~ selectedContent ~ currentFields:', currentFields);

    return <TableForm formSchema={currentFields} onChange={handleFormChange} />;
  }, [fields, currentTabId, formDataByTab, isDetail]);

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    setSearchParams({ tab: index.toString() });
  };

  if (!tabs) return null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
