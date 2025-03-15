import api from '@/api';
import TableForm from '@/components/TableForm/TableForm';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ObjectFormStyled } from '../ObjectForm/ObjectForm.styled';
import ObjectTabs from '../ObjectForm/ObjectTabs';

export default function ObjectFormDetail() {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
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
      api.tree.getFields({
        nodeId: selectedTab?.id ?? '',
        action: selectedTab?.options?.action,
        tabId: currentTabId || '',
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection && !!currentTabId
  });

  const { data: object } = useQuery({
    queryKey: ['tabObject', currentConnection?.id, selectedTab?.id, selectedTab?.options?.action, currentTabId],
    queryFn: () =>
      api.tree.getObject({
        nodeId: selectedTab?.id ?? '',
        action: selectedTab?.options?.action,
        tabId: currentTabId || '',
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection && !!currentTabId
  });

  useEffect(() => {
    if (currentTabId && object && !formDataByTab[currentTabId]) {
      setFormDataByTab((prev) => ({
        ...prev,
        [currentTabId]: object
      }));
    }
  }, [currentTabId, object]);

  const handleFormChange = (data: any) => {
    if (!currentTabId) return;

    setFormDataByTab((prev) => ({
      ...prev,
      [currentTabId]: data
    }));
  };

  const selectedContent = useMemo(() => {
    if (!fields || !currentTabId) return null;

    return (
      <TableForm formSchema={fields} onChange={handleFormChange} formData={formDataByTab[currentTabId] || object} />
    );
  }, [fields, currentTabId, formDataByTab, object]);

  if (!tabs) return null;

  return (
    <ObjectFormStyled>
      <ObjectTabs tabs={tabs} selectedTabIndex={selectedTabIndex} setSelectedTabIndex={setSelectedTabIndex} />
      {selectedContent}
    </ObjectFormStyled>
  );
}
