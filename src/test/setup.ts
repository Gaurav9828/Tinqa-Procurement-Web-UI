import '@testing-library/jest-dom/vitest';
import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { probeImage } from '../features/products-management/api/imageProbe';

// Product images are looked for in their folder by loading them: none is there unless a test says so (imagesInFolder)
vi.mock('../features/products-management/api/imageProbe', () => ({ probeImage: vi.fn() }));

// No real network in tests. An API call nobody mocked fails the test that made it, naming the call, so every
// request a screen makes is one its tests know about (and expect).
const unmockedCalls: string[] = [];

axios.defaults.adapter = (config) => {
  unmockedCalls.push(`${config.method?.toUpperCase()} ${axios.getUri(config)}`);
  return Promise.reject(new AxiosError('Network disabled in unit tests', 'ERR_NETWORK', config));
};

// Anything using fetch (e.g. the PIN code lookup) sees an outage unless the test stubs it.
beforeEach(() => {
  unmockedCalls.length = 0;
  vi.mocked(probeImage).mockReset().mockResolvedValue(false);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Network disabled in tests'))));
});

// jsdom does not implement scrolling.
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  if (unmockedCalls.length) {
    const calls = unmockedCalls.splice(0);
    throw new Error(`Unmocked API call(s) in this test, mock them: ${calls.join(', ')}`);
  }
});
