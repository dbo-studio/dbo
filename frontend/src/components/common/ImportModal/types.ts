export type ImportModalProps = {
    show: boolean;
    connectionId: number;
    table: string;
    onClose: () => void;
}