export type AIChat = {
  id: number;
  title: string;
  createdAt: string;
  messages: AIMessage[];
};

export type AIMessage = {
  role: string;
  content: string;
  createdAt: string;
};
