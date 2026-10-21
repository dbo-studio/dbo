import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useWorkspaceCanvas } from '@/components/common/AgentWorkspace/workspaceCanvas.store';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { lazy, Suspense, type JSX } from 'react';
import { AgentCardBodyStyled, AgentCardStyled } from '../AgentCards.styled';
import type { ChartReport } from '../../utils/chartReport';
import { useSaveReport } from '../../hooks/useSaveReport';

const ChartView = lazy(() => import('@/components/common/ChartView/ChartView'));

/** A chart the agent drew, in the chat; Open in canvas shows it large and editable in the workstation. */
export default function ReportCard({ report }: { report: ChartReport }): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);
  const showReport = useWorkspaceCanvas((state) => state.showReport);
  const { mutate: save, isPending: saving, data: saved } = useSaveReport();

  const open = (): void => {
    showReport(saved ?? report);
    updateUI({ agentWorkspaceOpen: true });
  };

  return (
    <AgentCardStyled data-testid='ai-report-card'>
      <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
        <CustomIcon type='layout' size='xs' />
        <Typography variant='caption' sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
          {report.title}
        </Typography>
        <Button
          size='small'
          variant='text'
          disabled={saving || !!saved}
          onClick={() => save(report)}
          data-testid='ai-report-save'
        >
          {saved ? locales.ai_report_saved : locales.ai_report_save}
        </Button>
        <Button size='small' variant='text' onClick={open} data-testid='ai-report-open'>
          {locales.ai_report_open}
        </Button>
      </Stack>
      <AgentCardBodyStyled>
        <Suspense fallback={<CircularProgress size={16} />}>
          <ChartView rows={report.rows} columns={report.columns} spec={report.spec} height={180} />
        </Suspense>
      </AgentCardBodyStyled>
    </AgentCardStyled>
  );
}
