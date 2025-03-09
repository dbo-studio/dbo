import api from '@/api';
import TableForm from '@/components/TableForm/TableForm';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, Tab, Tabs } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

interface FormField {
  id: string;
  name: string;
  type: string;
  options?: any;
  required?: boolean;
}

export default function ObjectForm() {
  const { currentConnection } = useConnectionStore();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const { data: formSchema } = useQuery({
    queryKey: ['objectForm', currentConnection?.id],
    queryFn: () =>
      api.object.getObject({
        action: 'createTable',
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection
  });

  const handleFormChange = (data: any) => {
    console.log('Form data changed:', data);
    // Handle form data changes here
  };

  const tabs = useMemo(() => {
    if (!formSchema) return [];
    return formSchema;
  }, [formSchema]);

  const selectedContent = useMemo(() => {
    if (!tabs.length) return null;
    const currentTab = tabs[selectedTabIndex];

    if (currentTab.type === 'array') {
      return <TableForm formSchema={currentTab.options} onChange={handleFormChange} />;
    }
    return <TableForm formSchema={[currentTab]} onChange={handleFormChange} />;
  }, [selectedTabIndex, tabs]);

  if (!formSchema || !tabs.length) return null;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={selectedTabIndex} onChange={(_, newValue) => setSelectedTabIndex(newValue)}>
          {tabs.map((tab: FormField) => (
            <Tab key={tab.id} label={tab.name} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>{selectedContent}</Box>
    </Box>
  );
}
