export type CreateChatRequestType = {
  title: string;
  connectionId: number | string;
  providerId?: number | string;
  model?: string | undefined;
};
