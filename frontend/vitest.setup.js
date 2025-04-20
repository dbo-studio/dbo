import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { worker } from './src/core/mocks/browser';

beforeAll(() => worker.start())
afterEach(() => worker.resetHandlers())
// afterAll(() => worker.close())