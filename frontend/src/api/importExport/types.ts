export type ImportRequestType = {
    connectionId: number;
    table: string;
    data: File;
    format: string;
    continueOnError: boolean;
    skipErrors: boolean;
    maxErrors: number;
}

export type ExportRequestType = {
    connectionId: number;
    table: string;
    query: string;
    format: string;
    chunkSize?: number;
    savePath?: string;
}

export type JobResponseType = {
    jobId: string;
}