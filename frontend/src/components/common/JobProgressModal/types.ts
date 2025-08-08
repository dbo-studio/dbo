export type JobProgressModalProps = {
    open: boolean;
    jobId: string | null;
    onClose: () => void;
    title: string;
}