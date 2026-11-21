import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { AlertTitle } from '@mui/material';
import type { JSX } from 'react';
import { WhatsNewAlertStyled } from './WhatsNewTip.styled';

export default function WhatsNewTip(): JSX.Element | null {
  const seen = useSettingStore((state) => state.editor.aiWhatsNewSeen);
  const updateEditor = useSettingStore((state) => state.updateEditor);
  if (seen) return null;

  return (
    <WhatsNewAlertStyled
      severity='info'
      variant='outlined'
      icon={<CustomIcon type='wand_sparkles' size='xs' />}
      onClose={() => updateEditor({ aiWhatsNewSeen: true })}
      data-testid='ai-whats-new'
    >
      <AlertTitle>{locales.ai_whats_new_title}</AlertTitle>
      {locales.ai_whats_new_body}
    </WhatsNewAlertStyled>
  );
}
