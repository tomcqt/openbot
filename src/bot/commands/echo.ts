import { Message } from '../../types';

export default {
  name: 'echo',
  handler: (data: Message) => {
    if (data.type !== 'message') return;
    return {
      type: 'message',
      data: {
        text: data.data.text?.replace('.echo', '').trim(),
      },
    };
  },
};
