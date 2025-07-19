import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { worker } from '../core/mocks/node';

// Mock JSDOM stylesheet handling
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    setProperty: () => {}
  }),
  writable: true
});

// Mock CSS.supports
Object.defineProperty(window, 'CSS', {
  value: {
    supports: () => true
  },
  writable: true
});

// Mock document.createRange
Object.defineProperty(document, 'createRange', {
  value: () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
  }),
  writable: true
});

// Mock document.createTextRange
Object.defineProperty(document, 'createTextRange', {
  value: () => ({
    collapse: () => {},
    selectNodeContents: () => {},
    setStart: () => {},
    setEnd: () => {},
    getBoundingClientRect: () => ({}),
    getClientRects: () => [],
  }),
  writable: true
});

// Mock document.selection
Object.defineProperty(document, 'selection', {
  value: {
    createRange: () => ({
      collapse: () => {},
      selectNodeContents: () => {},
      setStart: () => {},
      setEnd: () => {},
      getBoundingClientRect: () => ({}),
      getClientRects: () => [],
    }),
    removeAllRanges: () => {},
    addRange: () => {},
  },
  writable: true
});

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: () => {},
    addRange: () => {},
    toString: () => '',
    rangeCount: 0,
    getRangeAt: () => ({
      collapse: () => {},
      selectNodeContents: () => {},
      setStart: () => {},
      setEnd: () => {},
      getBoundingClientRect: () => ({}),
      getClientRects: () => [],
    }),
  }),
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

// Mock window.scrollBy
Object.defineProperty(window, 'scrollBy', {
  value: vi.fn(),
  writable: true
});

// Mock window.scroll
Object.defineProperty(window, 'scroll', {
  value: vi.fn(),
  writable: true
});

// Mock window.focus
Object.defineProperty(window, 'focus', {
  value: vi.fn(),
  writable: true
});

// Mock window.blur
Object.defineProperty(window, 'blur', {
  value: vi.fn(),
  writable: true
});

// Mock window.open
Object.defineProperty(window, 'open', {
  value: vi.fn(),
  writable: true
});

// Mock window.print
Object.defineProperty(window, 'print', {
  value: vi.fn(),
  writable: true
});

// Mock window.stop
Object.defineProperty(window, 'stop', {
  value: vi.fn(),
  writable: true
});

// Mock window.close
Object.defineProperty(window, 'close', {
  value: vi.fn(),
  writable: true
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(),
  writable: true
});

// Mock window.prompt
Object.defineProperty(window, 'prompt', {
  value: vi.fn(),
  writable: true
});

// Mock window.requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn(cb => setTimeout(cb, 0)),
  writable: true
});

// Mock window.cancelAnimationFrame
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn(),
  writable: true
});

// Mock window.requestIdleCallback
Object.defineProperty(window, 'requestIdleCallback', {
  value: vi.fn(cb => setTimeout(cb, 0)),
  writable: true
});

// Mock window.cancelIdleCallback
Object.defineProperty(window, 'cancelIdleCallback', {
  value: vi.fn(),
  writable: true
});

// Mock Element.prototype methods
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(Element.prototype, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(Element.prototype, 'scrollBy', {
  value: vi.fn(),
  writable: true
});

// Mock HTMLElement.prototype methods
Object.defineProperty(HTMLElement.prototype, 'focus', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(HTMLElement.prototype, 'blur', {
  value: vi.fn(),
  writable: true
});

// Mock HTMLInputElement.prototype methods
Object.defineProperty(HTMLInputElement.prototype, 'select', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(HTMLInputElement.prototype, 'setSelectionRange', {
  value: vi.fn(),
  writable: true
});

// Mock HTMLTextAreaElement.prototype methods
Object.defineProperty(HTMLTextAreaElement.prototype, 'select', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(HTMLTextAreaElement.prototype, 'setSelectionRange', {
  value: vi.fn(),
  writable: true
});

// Setup MSW
beforeAll(() => worker.listen())
afterEach(() => worker.resetHandlers())
afterAll(() => worker.close())