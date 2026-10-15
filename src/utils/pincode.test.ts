import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPincodeLocation, clearPincodeCache, isIndianPincode, lookupPincode } from './pincode';

const indiaPost = (body: unknown, status = 200) =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status }));

const HINJAWADI = [
  {
    Status: 'Success',
    PostOffice: [
      { Name: 'Hinjawadi', District: 'Pune', State: 'Maharashtra' },
      { Name: 'Marunji', District: 'Pune', State: 'Maharashtra' },
      { Name: 'Hinjawadi', District: 'Pune', State: 'Maharashtra' },
    ],
  },
];

beforeEach(() => clearPincodeCache());

describe('lookupPincode', () => {
  it('reads city, district, state and areas from India Post', async () => {
    const fetchMock = indiaPost(HINJAWADI);
    vi.stubGlobal('fetch', fetchMock);
    expect(await lookupPincode(' 411057 ')).toEqual({
      status: 'found',
      location: { city: 'Pune', district: 'Pune', state: 'Maharashtra', country: 'India', areas: ['Hinjawadi', 'Marunji'] },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.postalpincode.in/pincode/411057');
    // Never the app's API client: no token or cookies go to the third party.
    expect(init).toMatchObject({ credentials: 'omit' });
    expect(init?.headers).toBeUndefined();
  });

  it('answers notFound for an unknown PIN code and caches it', async () => {
    const fetchMock = indiaPost([{ Status: 'Error', Message: 'No records found', PostOffice: null }]);
    vi.stubGlobal('fetch', fetchMock);
    expect(await lookupPincode('999999')).toEqual({ status: 'notFound' });
    expect(await lookupPincode('999999')).toEqual({ status: 'notFound' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not call the service for an invalid PIN code', async () => {
    const fetchMock = indiaPost(HINJAWADI);
    vi.stubGlobal('fetch', fetchMock);
    expect(await lookupPincode('041105')).toEqual({ status: 'notFound' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isIndianPincode('41105')).toBe(false);
    expect(isIndianPincode('411057')).toBe(true);
  });

  it('throws on outages and odd answers, without caching them', async () => {
    vi.stubGlobal('fetch', indiaPost({}, 503));
    await expect(lookupPincode('411057')).rejects.toThrow(/503/);
    vi.stubGlobal('fetch', indiaPost({ unexpected: true }));
    await expect(lookupPincode('411057')).rejects.toThrow(/Unexpected/);
    vi.stubGlobal('fetch', indiaPost(HINJAWADI));
    expect((await lookupPincode('411057')).status).toBe('found');
  });
});

describe('applyPincodeLocation', () => {
  const location = { city: 'Pune', district: 'Pune', state: 'Maharashtra', country: 'India' as const, areas: [] };

  it('replaces everything for a new PIN code', () => {
    expect(applyPincodeLocation({ city: 'Mumbai', district: '', state: 'MH' }, location, false)).toEqual({ city: 'Pune', district: 'Pune', state: 'Maharashtra' });
  });

  it('only fills blanks for the PIN code a record was saved with', () => {
    expect(applyPincodeLocation({ city: 'Hinjawadi', district: '', state: 'Maharashtra' }, location, true)).toEqual({ city: 'Hinjawadi', district: 'Pune', state: 'Maharashtra' });
  });
});
