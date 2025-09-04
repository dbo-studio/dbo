import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton } from '@mui/material';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { CodeMessageProps } from '../../types';
import { CodeMessageHeaderStyled, CodeMessageStyled } from './CodeMessage.styled';

export default function CodeMessage({ message }: CodeMessageProps) {
  const [_, copy] = useCopyToClipboard();
  const isDark = useSettingStore((state) => state.isDark);

  const handleCopy = async (): Promise<void> => {
    try {
      await copy(message.content);
      toast.success(locales.copied);
    } catch (error) {
      console.debug('🚀 ~ handleCopy ~ error:', error);
    }
  };

  return (
    <CodeMessageStyled>
      <CodeMessageHeaderStyled isdark={isDark?.toString() ?? 'false'}>
        <CustomIcon type='code' />
        <IconButton onClick={handleCopy}>
          <CustomIcon type='copy' />
        </IconButton>
      </CodeMessageHeaderStyled>
      <SyntaxHighlighter value={message.content} isDark={isDark ?? false} />
    </CodeMessageStyled>
  );
}
