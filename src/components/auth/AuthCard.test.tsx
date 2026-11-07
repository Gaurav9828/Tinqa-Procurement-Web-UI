import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { AuthCard } from './AuthCard';
import { DEFAULT_ADMIN_LOGIN, resetAdminLoginContent, toAdminLoginContent } from './loginPageContent';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});
const get = vi.mocked(axios.get);

const LIVE = {
  brandName: 'TinQa',
  loginImageUrl: 'https://api.tinqa.com/api/company/assets/login-image-abc.jpg',
  adminLoginHeadline: 'Run procurement in one place.',
  adminLoginTagline: 'For staff and suppliers.',
  adminLoginHighlights: ['Quotes and POs', 'Approvals'],
  storeLoginHeadline: 'Not for this portal',
  storeLoginHighlights: ['Storefront only'],
};

const renderCard = () =>
  render(
    <AuthCard subtitle="Staff & Supplier Sign-in">
      <form aria-label="Sign in" />
    </AuthCard>
  );

beforeEach(() => {
  resetAdminLoginContent();
  localStorage.clear();
  get.mockReset();
});

describe('Admin sign-in page', () => {
  it('shows the live image covering the panel and the admin portal text (not the storefront\'s)', async () => {
    get.mockResolvedValue({ data: { success: true, data: LIVE } });
    renderCard();
    const panel = screen.getByTestId('auth-brand-panel');
    await waitFor(() => expect(panel).toHaveTextContent('Run procurement in one place.'));
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/company\/profile$/), expect.anything());
    const image = panel.querySelector('img[alt=""]');
    expect(image).toHaveAttribute('src', LIVE.loginImageUrl);
    expect(image).toHaveClass('object-cover', 'w-full', 'h-full');
    expect(within(panel).getByText('For staff and suppliers.')).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Quotes and POs', 'Approvals']);
    expect(panel).not.toHaveTextContent('Storefront only');
    // Remembered for the next visit
    expect(JSON.parse(localStorage.getItem('tinqa.loginPage')!)).toMatchObject({ headline: 'Run procurement in one place.' });
  });

  it('keeps the built-in text and gradient when the profile can\'t be loaded', async () => {
    get.mockRejectedValue(new Error('Network Error'));
    renderCard();
    await waitFor(() => expect(get).toHaveBeenCalled());
    const panel = screen.getByTestId('auth-brand-panel');
    expect(panel).toHaveTextContent(DEFAULT_ADMIN_LOGIN.headline);
    expect(panel.querySelector('img[alt=""]')).toBeNull();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('toAdminLoginContent', () => {
  it('leaves out what an admin cleared, keeps defaults for fields an older backend does not send', () => {
    expect(toAdminLoginContent({ adminLoginHeadline: null, adminLoginTagline: '', adminLoginHighlights: null, loginImageUrl: '  ' })).toEqual({
      imageUrl: null,
      headline: '',
      tagline: '',
      highlights: [],
    });
    expect(toAdminLoginContent({ brandName: 'TinQa' })).toEqual(DEFAULT_ADMIN_LOGIN);
  });
});
