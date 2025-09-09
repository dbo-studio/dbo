import api from "@/api";
import locales from "@/locales";
import { useSettingStore } from "@/store/settingStore/setting.store";
import { Box, Button, Divider, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function CheckUpdate() {
    const general = useSettingStore((state) => state.general);
    const updateGeneral = useSettingStore((state) => state.updateGeneral);

    const [buttonText, setButtonText] = useState(
        general.release ? locales.update : locales.check
    );

    const { mutateAsync: checkUpdateMutation, isPending: isCheckUpdatePending } = useMutation({
        mutationFn: async () => await api.config.getCheckUpdate()
    })

    const handleCheckUpdate = async () => {
        try {
            const response = await checkUpdateMutation();
            if (response.name !== general.version) {
                setButtonText(locales.update);
                updateGeneral({ release: response });
            } else {
                setButtonText(locales.you_are_up_to_date);
            }
        } catch (error) {
            console.debug('🚀 ~ handleCheckUpdate ~ error:', error);
        }
    }

    const handleUpdate = async () => {
        window.open(general.release?.url, '_blank');

    }

    return (
        <Box mt={1}>
            <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
                <Box>
                    {
                        general.release ? (
                            <Typography color={'textText'} variant={'subtitle2'}>
                                {locales.new_version_available} : {general.release?.name}
                            </Typography>
                        ) : (
                            <Typography color={'textText'} variant={'subtitle2'}>
                                {locales.check_for_updates}
                            </Typography>
                        )
                    }
                </Box>

                {
                    !general.release ? (
                        <Button loading={isCheckUpdatePending} loadingPosition='start' variant={'outlined'} size={'small'} onClick={handleCheckUpdate}>
                            {buttonText}
                        </Button>
                    ) : (
                        <Button variant={'outlined'} size={'small'} onClick={handleUpdate}>
                            {buttonText}
                        </Button>
                    )
                }
            </Box>
            <Divider />
        </Box>
    );
}