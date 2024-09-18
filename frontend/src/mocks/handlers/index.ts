import { http, HttpResponse } from 'msw';

export const handlers = [
  // An example handler
  http.get('/user', () => {
    return HttpResponse.json({ name: 'John Maverick' });
  })
];
