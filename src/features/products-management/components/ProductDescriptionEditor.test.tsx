import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Permission } from '../../../config/access';
import { productApi } from '../api/productsApi';
import { clearDescriptionReferenceCache } from '../hooks/useDescriptionSuggestions';
import { ProductDescriptionEditor } from './ProductDescriptionEditor';

// Only the network layer is mocked.
vi.mock('../api/productsApi', () => ({ productApi: { getDescriptionReference: vi.fn() } }));
const api = vi.mocked(productApi);

const signIn = (permissions: Permission[]) =>
    useAuthStore.setState({
        token: null,
        isAuthenticated: true,
        user: { userId: 1, username: 'cat', email: 'cat@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
    });

const REFERENCE = {
    subject: 'Kedarnath',
    title: 'Kedarnath Temple',
    description: 'Hindu temple in Uttarakhand, India',
    summary: 'Kedarnath Temple is a Hindu temple dedicated to Shiva. It is one of the twelve Jyotirlingas.',
    url: 'https://en.wikipedia.org/wiki/Kedarnath_Temple',
    source: 'Wikipedia',
};

const Harness = ({ initial = '', onValue }: { initial?: string; onValue?: (value: string) => void }) => {
    const [value, setValue] = useState(initial);
    return (
        <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
            <ProductDescriptionEditor
                value={value}
                onChange={(next) => {
                    setValue(next);
                    onValue?.(next);
                }}
                context={{ title: 'Kedarnath', tagline: 'Where the Himalaya bows', specifications: [] }}
            />
            <button type="button" onClick={() => setValue('## Overview\nReset from outside')}>reset</button>
        </Provider>
    );
};

describe('ProductDescriptionEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearDescriptionReferenceCache();
        signIn(['PRODUCT_VIEW', 'PRODUCT_CREATE']);
    });

    it('writes each section and stores the template text', async () => {
        const user = userEvent.setup();
        let latest = '';
        render(<Harness onValue={(v) => (latest = v)} />);

        await user.type(screen.getByLabelText('Overview'), 'Dawn at Kedarnath.');
        await user.type(screen.getByLabelText('Highlights'), 'Sunrise LEDs{Enter}AI wake');
        expect(latest).toBe('## Overview\nDawn at Kedarnath.\n\n## Highlights\n- Sunrise LEDs\n- AI wake');
    });

    it('opens a description written before the template in Overview', () => {
        render(<Harness initial="An old plain description." />);
        expect(screen.getByLabelText('Overview')).toHaveValue('An old plain description.');
        expect(screen.getByText(/written before the template/)).toBeInTheDocument();
    });

    it('takes a new value from outside (form reset, draft loaded)', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'reset' }));
        expect(screen.getByLabelText('Overview')).toHaveValue('Reset from outside');
    });

    it('suggests three versions with one lookup per subject, applies one and can undo it', async () => {
        const user = userEvent.setup();
        api.getDescriptionReference.mockResolvedValue(REFERENCE);
        let latest = '';
        render(<Harness onValue={(v) => (latest = v)} />);

        await user.click(screen.getByRole('button', { name: /Suggest descriptions/ }));
        expect(screen.getByLabelText('What does the miniature show?')).toHaveValue('Kedarnath');
        await user.click(screen.getByRole('button', { name: 'Suggest' }));

        expect(await screen.findByRole('button', { name: 'Use the Heritage version' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use the Technology version' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use the Gift & décor version' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Wikipedia: Kedarnath Temple/ })).toHaveAttribute('href', REFERENCE.url);
        expect(api.getDescriptionReference).toHaveBeenCalledWith('Kedarnath');

        // Asking again for the same subject (any case/spacing) costs no call
        await user.clear(screen.getByLabelText('What does the miniature show?'));
        await user.type(screen.getByLabelText('What does the miniature show?'), '  kedarnath {Enter}');
        expect(api.getDescriptionReference).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Use the Heritage version' }));
        expect(latest).toMatch(/^## Overview\nKedarnath recreates Kedarnath Temple/);
        expect(screen.getByLabelText('The Story')).toHaveValue(REFERENCE.summary);

        await user.click(screen.getByRole('button', { name: /Undo suggestion/ }));
        expect(latest).toBe('');
        expect(screen.getByLabelText('Overview')).toHaveValue('');
    });

    it('without PRODUCT_VIEW builds the versions from the product alone, with no call', async () => {
        signIn(['PRODUCT_CREATE']);
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: /Suggest descriptions/ }));
        await user.click(screen.getByRole('button', { name: 'Suggest' }));
        expect(await screen.findByRole('button', { name: 'Use the Heritage version' })).toBeInTheDocument();
        expect(screen.getByText(/write The Story yourself/)).toBeInTheDocument();
        expect(api.getDescriptionReference).not.toHaveBeenCalled();
    });

    it('when the lookup fails still offers versions built from the product', async () => {
        const user = userEvent.setup();
        api.getDescriptionReference.mockRejectedValue(new Error('Wikipedia is unavailable'));
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: /Suggest descriptions/ }));
        await user.click(screen.getByRole('button', { name: 'Suggest' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Use the Gift & décor version' })).toBeInTheDocument());
        expect(screen.getByText(/write The Story yourself/)).toBeInTheDocument();
    });
});
