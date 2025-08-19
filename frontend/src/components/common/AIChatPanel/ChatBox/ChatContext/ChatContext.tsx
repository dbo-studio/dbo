import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Divider, IconButton, Stack } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { ChatContextProps, ContextItemType } from '../../types';
import { ChatContextStyled } from './ChatContext.styled';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ChatContextModal from './ChatContextModal/ChatContextModal';
import ChatContextModalItem from './ChatContextModal/ChatContextModalItem/ChatContextModalItem';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const context = useAiStore((state) => state.context);
  const selectedTab = useSelectedTab();
  const updateContext = useAiStore((state) => state.updateContext);

  const [localSchema, setLocalSchema] = useState<string>('');
  const [localDatabase, setLocalDatabase] = useState<string>('');

  const [localContext, setLocalContext] = useState<{
    tables: string[];
    views: string[];
  }>({
    tables: context.tables,
    views: context.views
  });

  useEffect(() => {
    if (!selectedTab) return;

    const database =
      localDatabase === '' ? (selectedTab?.options?.database ?? autocomplete?.databases[0]) : localDatabase;
    const schema = localSchema === '' ? (selectedTab?.options?.schema ?? autocomplete?.schemas[0]) : localSchema;

    setLocalDatabase(database);
    setLocalSchema(schema);
    updateContext({ ...context, database, schema });
  }, []);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleContextChange = (name: string, type: ContextItemType) => {
    setLocalContext({ ...localContext, [type]: [...localContext[type], name] });

    if (context[type]?.some((c) => c === name)) {
      updateContext({ ...context, [type]: context[type].filter((c) => c !== name) });
    } else {
      updateContext({ ...context, [type]: [...context[type], name] });
    }
  };

  const handleDatabaseChange = (database: string) => {
    setLocalDatabase(database);
    updateContext({ ...context, database });
  };

  const handleSchemaChange = (schema: string) => {
    setLocalSchema(schema);
    updateContext({ ...context, schema });
  };

  return (
    <Box>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'flex-start'}
        flexWrap={'wrap'}
        alignContent={'center'}
        spacing={1}
      >
        <IconButton ref={anchorRef} onClick={handleToggle}>
          <CustomIcon type='at' size='s' />
        </IconButton>
        <SelectInput
          emptylabel={locales.no_active_database_find}
          value={localDatabase}
          disabled={autocomplete?.databases?.length === 0}
          size='small'
          options={autocomplete?.databases.map((s) => ({ value: s, label: s })) ?? []}
          onChange={(e): void => handleDatabaseChange(e.value)}
        />
        <SelectInput
          emptylabel={locales.no_active_schema_find}
          value={localSchema}
          disabled={autocomplete?.schemas?.length === 0}
          size='small'
          options={autocomplete?.schemas.map((s) => ({ value: s, label: s })) ?? []}
          onChange={(e): void => handleSchemaChange(e.value)}
        />

        {context.tables.map((item) => (
          <ChatContextItem key={item} name={item} type={'tables'} onClick={() => handleContextChange(item, 'tables')} />
        ))}

        {context.views.map((item) => (
          <ChatContextItem key={item} name={item} type={'views'} onClick={() => handleContextChange(item, 'views')} />
        ))}
      </Stack>

      <ChatContextModal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <ChatContextStyled>
          {autocomplete?.tables.map((table) => (
            <ChatContextModalItem
              key={`${table}-table`}
              name={table}
              type={'tables'}
              isActive={localContext.tables.some((c) => c === table)}
              onClick={handleContextChange}
            />
          ))}
          {autocomplete?.views.length > 0 && <Divider sx={{ marginBottom: 1 }} />}
          {autocomplete?.views.map((view) => (
            <ChatContextModalItem
              key={`${view}-view`}
              name={view}
              type={'views'}
              isActive={localContext.views.some((c) => c === view)}
              onClick={handleContextChange}
            />
          ))}
        </ChatContextStyled>
      </ChatContextModal>
    </Box>
  );
}
