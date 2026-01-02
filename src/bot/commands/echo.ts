import { ClientData } from '../../types';

export default {
  name: 'echo',
  handler: (data: ClientData) => {
    return {
      type: 'message',
      data: {
        text: data.text,
      },
    };
  },
};
