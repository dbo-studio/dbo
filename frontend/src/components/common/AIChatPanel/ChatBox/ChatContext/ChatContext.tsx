import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Divider, IconButton, Stack } from '@mui/material';
import { useRef, useState } from 'react';
import { useToggle } from 'usehooks-ts';
import type { ChatContextProps, ContextItemType } from '../../types';
import { ChatContextStyled } from './ChatContext.styled';
import ChatContextItem from './ChatContextItem/ChatContextModalItem';
import ChatContextModalItem from './ChatContextModalItem/ChatContextModalItem';

export default function ChatContext({ autocomplete }: ChatContextProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, toggleOpen, setOpen] = useToggle(false);

  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);

  const [localContext, setLocalContext] = useState<{
    tables: string[];
    views: string[];
  }>({
    tables: context.tables,
    views: context.views
  });

  const handleContextChange = (name: string, type: ContextItemType) => {
    setLocalContext({ ...localContext, [type]: [...localContext[type], name] });

    if (context[type]?.some((c) => c === name)) {
      updateContext({ ...context, [type]: context[type].filter((c) => c !== name) });
    } else {
      updateContext({ ...context, [type]: [...context[type], name] });
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
        <IconButton ref={anchorRef} onClick={toggleOpen}>
          <CustomIcon type='at' size='s' />
        </IconButton>

        {context.tables.map((item) => (
          <ChatContextItem key={item} name={item} onClick={() => handleContextChange(item, 'tables')} />
        ))}

        {context.views.map((item) => (
          <ChatContextItem key={item} name={item} onClick={() => handleContextChange(item, 'views')} />
        ))}
      </Stack>

      <DropDownMenu open={isOpen} onClose={() => setOpen(false)} anchorRef={anchorRef}>
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
      </DropDownMenu>
    </Box>
  );
}
