/** How long an image may take to load before it counts as not there. */
const PROBE_TIMEOUT_MS = 10_000;

/**
 * Whether an image loads from this address. It is a static file the browser loads like any <img>, not an API call, so
 * it doesn't go through the API clients. Mocked in unit tests (src/test/setup.ts).
 */
export const probeImage = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const image = new Image();
    const done = (found: boolean) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(found);
    };
    const timer = setTimeout(() => done(false), PROBE_TIMEOUT_MS);
    image.onload = () => done(true);
    image.onerror = () => done(false);
    image.src = url;
  });
