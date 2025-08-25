import { type FullConfig } from '@playwright/test';
import { exec } from 'child_process';

async function globalSetup(config: FullConfig) {
    exec('rm -rf ./../backend/data/dbo.db_testing.db', (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }
    });

    exec('docker restart dbo-studio-dev-api', (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }
    });
}

export default globalSetup;