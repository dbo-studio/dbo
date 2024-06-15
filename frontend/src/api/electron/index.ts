import { ChannelName, MessageType } from '@/src/core/constants';

export const getPort = () => {
  window.electron.send(
    ChannelName,
    JSON.stringify({
      name: MessageType.GET_PORT
    })
  );
};
