import SelectInput from "@/components/base/SelectInput/SelectInput";
import { SelectInputOption } from "@/components/base/SelectInput/types";
import SyntaxHighlighter from "@/components/base/SyntaxHighlighter/SyntaxHighlighter";
import locales from "@/locales";
import { useSettingStore } from "@/store/settingStore/setting.store";
import { Box, Divider, FormControl, Slider, Typography } from "@mui/material";
import { JSX } from "react";
import { EditorThemePreviewStyled } from "./EditorTheme.styled";

const editorThemes = [
    { value: 'github-light', label: 'GitHub Light' },
    { value: 'github-dark', label: 'GitHub Dark' }
];

export default function EditorTheme(): JSX.Element {
    const theme = useSettingStore((state) => state.theme);
    const updateTheme = useSettingStore((state) => state.updateTheme);

    return (
        <Box>
            <Box mb={1} mt={3}>
                <Typography variant='body1'>{locales.editor_theme}</Typography>
            </Box>
            <Divider />
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <SelectInput
                    value={theme.editorTheme}
                    options={editorThemes}
                    onChange={(value): void => updateTheme({ editorTheme: (value as SelectInputOption)?.value as 'github-light' | 'github-dark' })}
                />
            </FormControl>
            <FormControl fullWidth>
                <EditorThemePreviewStyled>
                    <SyntaxHighlighter value={`SELECT * FROM users WHERE id = 1;`} />
                </EditorThemePreviewStyled>
            </FormControl>

            <Box sx={{ mt: 4, px: 2, mb: 4 }}>
                <Slider
                    value={theme.editorFontSize}
                    onChange={(_, value): void => updateTheme({ editorFontSize: value as number })}
                    min={10}
                    max={24}
                    step={1}
                    marks
                    valueLabelDisplay='on'
                />
            </Box>
            <Box
                sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}
            >
                <Typography
                    variant='body2'
                    color='textText'
                    sx={{
                        fontSize: `${theme.editorFontSize}px`,
                        fontFamily: 'monospace'
                    }}
                >
                    Preview: SELECT * FROM users WHERE id = 1;
                </Typography>
            </Box>
        </Box >
    )
}