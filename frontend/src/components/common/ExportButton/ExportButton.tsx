import api from '@/api';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { Box, Button, TextField } from '@mui/material';
import { save } from '@tauri-apps/plugin-dialog';
import type React from 'react';
import { useEffect, useState } from 'react';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';
import { useTabStore } from '@/store/tabStore/tab.store';

interface ExportButtonProps {
    connectionId: number;
    query: string;
    onExport?: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ connectionId, query, onExport }) => {
    const [showOptions, setShowOptions] = useState(false);
    const [format, setFormat] = useState('sql');
    const [showProgress, setShowProgress] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [isTauri, setIsTauri] = useState(false);
    const [savePath, setSavePath] = useState('');


    useEffect(() => {
        const checkTauri = async () => {
            const tauriResult = await tools.isTauri();
            setIsTauri(tauriResult);
        };
        checkTauri();
    }, []);

    const handleSelectFile = async () => {
        if (!save) {
            console.warn('Tauri dialog not available');
            return;
        }

        try {
            // Generate default filename based on current date and time
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
            const defaultFileName = `export_${timestamp}.${format}`;

            const filePath = await save({
                defaultPath: defaultFileName,
                filters: [
                    {
                        name: 'Export Files',
                        extensions: [format]
                    }
                ]
            });

            if (filePath) {
                setSavePath(filePath);
            }
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    };

    const handleExport = async () => {
        try {
            console.log('Starting export with:', { query, format, savePath });
            const response = await api.importExport.exportData({
                connectionId,
                table: useTabStore.getState().selectedTab()?.table ?? '',
                query,
                format,
                savePath: isTauri ? savePath : undefined,
            });
            console.log('Export response:', response);

            // Extract jobId from response
            const jobId = response?.jobId;
            console.log('Extracted jobId:', jobId);

            setJobId(jobId);
            setShowProgress(true);
            setShowOptions(false);
            onExport?.();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    return (
        <>
            <Button onClick={() => setShowOptions(true)} variant="contained">
                Export
            </Button>

            <Modal open={showOptions} title="Export Options" onClose={() => setShowOptions(false)}>
                <Box display={'flex'} flexDirection={'column'} flex={1}>
                    <Box flex={1}>
                        <SelectInput
                            emptylabel={locales.no_column_found}
                            value={format}
                            onChange={(e) => setFormat(e.value)}
                            label="Format"
                            options={[
                                { label: 'SQL', value: 'sql' },
                                { label: 'JSON', value: 'json' },
                                { label: 'CSV', value: 'csv' },
                            ]}
                        />

                        {isTauri && (
                            <Box sx={{ mt: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Save Path"
                                    value={savePath}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSavePath(e.target.value)}
                                    placeholder="Enter file path or click Browse"
                                    margin="normal"
                                    size="small"
                                    InputProps={{
                                        endAdornment: (
                                            <Button
                                                size="small"
                                                onClick={handleSelectFile}
                                                sx={{ minWidth: 'auto', px: 1 }}
                                            >
                                                Browse
                                            </Button>
                                        ),
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                    <Box display={'flex'} mt={2} justifyContent={'space-between'}>
                        <Button size='small' onClick={() => setShowOptions(false)}>
                            {locales.cancel}
                        </Button>

                        <Button
                            onClick={handleExport}
                            size='small'
                            variant='contained'
                            disabled={isTauri && !savePath.trim()}
                        >
                            <span>{locales.export}</span>
                        </Button>
                    </Box>

                </Box>
            </Modal >

            <JobProgressModal
                open={showProgress}
                jobId={jobId}
                onClose={() => setShowProgress(false)}
                title="Exporting Data"
            />
        </>
    );
}; 