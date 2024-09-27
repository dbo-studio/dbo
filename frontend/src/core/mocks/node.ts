import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const worker = setupServer(...handlers);
