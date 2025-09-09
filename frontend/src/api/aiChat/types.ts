export type CreateChatRequestType = {
  title: string;
  connectionId: number | string;
};

export type AiChatRequestType = {
  connectionId: number | string;
  page?: number;
  count?: number;
};

export type AiChatDetailRequestType = {
  id: number | string;
  page?: number;
  count?: number;
};
