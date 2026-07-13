import { handleRequest } from './ai-handler.js';
import { AiQuotaDurableObject } from './ai/quota-do.js';

export { AiQuotaDurableObject };

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
