import api from "@/api";
import { tools } from "@/core/utils";
import locales from "@/locales";
import { useSettingStore } from "@/store/settingStore/setting.store";
import { Box, Button, Divider, Typography } from "@mui/material";
import { openPath } from "@tauri-apps/plugin-opener";

export function ShowLogs() {
    const general = useSettingStore((state) => state.general);

    const handleOpenLogs = async (): Promise<void> => {
        if (await tools.isTauri()) {
            await openPath(general.logsPath);
        } else {
            try {
                const blob = await api.config.getLogsPath();
                tools.fileDownload(blob, 'logs.txt');
            } catch (error) {
                console.debug('🚀 ~ handleOpenLogs ~ error:', error);
            }
        }
    };


    return (
        <Box mt={1}>
            <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
                <Box>
                    <Typography color={'textText'} variant={'subtitle2'}>
                        {locales.show_logs}
                    </Typography>
                    <Typography sx={{ userSelect: 'text' }} color={'textText'} variant={'caption'}>
                        {general.logsPath}
                    </Typography>
                </Box>

                <Button variant={'outlined'} size={'small'} onClick={handleOpenLogs}>
                    {locales.open}
                </Button>
            </Box>
            <Divider />
        </Box>
    );
}