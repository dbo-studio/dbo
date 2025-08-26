import { type FullConfig } from '@playwright/test';
import { exec } from 'child_process';

async function globalSetup(config: FullConfig) {
    exec('docker restart dbo-studio-dev-api', (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }
    });
}

export default globalSetup;