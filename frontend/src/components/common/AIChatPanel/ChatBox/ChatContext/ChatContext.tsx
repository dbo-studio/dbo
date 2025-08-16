import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Divider, IconButton, Stack } from '@mui/material';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ChatContextProps, ContextItemType } from '../../types';
import { ChatContextStyled } from './ChatContext.styled';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ChatContextModal from './ChatContextModal/ChatContextModal';
import ChatContextModalItem from './ChatContextModal/ChatContextModalItem/ChatContextModalItem';

export default function ChatContext({ autocomplete, contextItems, onContextChange }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const [localSchema, setLocalSchema] = useState<string>(
    selectedTab?.options?.schema ?? autocomplete?.schemas[0] ?? ''
  );
  const [localDatabase, setLocalDatabase] = useState<string>(
    selectedTab?.options?.database ?? autocomplete?.databases[0] ?? ''
  );

  useEffect(() => {
    if (!selectedTab) return;

    updateSelectedTab({ ...selectedTab, options: { database: localDatabase, schema: localSchema } });
  }, [localSchema, localDatabase]);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleContextChange = (name: string, type: ContextItemType) => {
    if (contextItems[type]?.some((c) => c === name)) {
      onContextChange({ ...contextItems, [type]: contextItems[type].filter((c) => c !== name) });
    } else {
      onContextChange({ ...contextItems, [type]: [...contextItems[type], name] });
    }
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
          onChange={(e): void => setLocalDatabase(e.value)}
        />
        <SelectInput
          emptylabel={locales.no_active_schema_find}
          value={localSchema}
          disabled={autocomplete?.schemas?.length === 0}
          size='small'
          options={autocomplete?.schemas.map((s) => ({ value: s, label: s })) ?? []}
          onChange={(e): void => setLocalSchema(e.value)}
        />
        {Object.entries(contextItems).map(([type, items]) => (
          <Fragment key={type}>
            {items.map((item) => (
              <ChatContextItem key={item} name={item} type={type as ContextItemType} onClick={handleContextChange} />
            ))}
          </Fragment>
        ))}
      </Stack>

      <ChatContextModal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <ChatContextStyled>
          {autocomplete?.tables.map((table) => (
            <ChatContextModalItem
              key={`${table}-table`}
              name={table}
              type={'tables'}
              isActive={contextItems.tables.some((c) => c === table)}
              onClick={handleContextChange}
            />
          ))}
          {autocomplete?.views.length > 0 && <Divider sx={{ marginBottom: 1 }} />}
          {autocomplete?.views.map((view) => (
            <ChatContextModalItem
              key={`${view}-view`}
              name={view}
              type={'views'}
              isActive={contextItems.views.some((c) => c === view)}
              onClick={handleContextChange}
            />
          ))}
        </ChatContextStyled>
      </ChatContextModal>
    </Box>
  );
}
