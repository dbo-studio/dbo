import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ObjectFormStyled } from './ObjectForm.styled';
import TableForm from './TableForm/TableForm';
import ObjectTabs from './ObjectTabs/ObjectTabs';

export default function ObjectForm({ isDetail = false }: { isDetail?: boolean }) {
  const { getSelectedTab, updateSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);

  const [selectedTabIndex, setSelectedTabIndex] = useState(Number.parseInt(selectedTab?.options?.tabId));
  const [formDataByTab, setFormDataByTab] = useState<Record<string, any>>({});
  const { currentConnection } = useConnectionStore();

  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action],
    queryFn: () =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
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
            nodeId: selectedTab?.nodeId ?? '',
            action: selectedTab?.options?.action,
            tabId: currentTabId || '',
            connectionId: String(currentConnection?.id || '')
          })
        : api.tree.getFields({
            nodeId: selectedTab?.nodeId ?? '',
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

    const currentFields = formDataByTab[currentTabId] || fields;

    return <TableForm formSchema={currentFields} onChange={handleFormChange} />;
  }, [fields, currentTabId, formDataByTab, isDetail]);

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    updateSelectedTab({
      ...selectedTab,
      options: {
        ...selectedTab?.options,
        tabId: index
      }
    } as TabType);
  };

  useEffect(() => {
    if (selectedTab) {
      setSelectedTabIndex(Number.parseInt(selectedTab?.options?.tabId));
    }
  }, [selectedTab]);

  if (!tabs) return null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={handleTabChange} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
