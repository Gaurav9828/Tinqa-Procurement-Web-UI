import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TabbedModal, modalTabPanelProps, statusOfTab, useModalTab, type ModalTab } from './TabbedModal';

type Part = 'one' | 'two' | 'three';
const TABS: readonly ModalTab<Part>[] = [
  { id: 'one', label: 'First part', hint: 'Name' },
  { id: 'two', label: 'Second part', hint: 'Amount' },
  { id: 'three', label: 'Third part' },
];

const Form: React.FC<{ recordId?: number; onSubmit?: () => void; loads?: () => void }> = ({ recordId, onSubmit, loads }) => {
  const [activeTab, setActiveTab] = useModalTab<Part>('one', recordId);
  const [name, setName] = useState('');
  const Loader = () => {
    loads?.();
    return <p>Loaded</p>;
  };
  return (
    <TabbedModal
      idPrefix="test-form"
      tabsLabel="Test sections"
      heading="Test form"
      onClose={() => {}}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      tabs={TABS}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      statusOf={(id) => statusOfTab(id, new Set<Part>(), { one: name.trim() !== '' })}
      actions={<button type="submit">Save</button>}
    >
      <section {...modalTabPanelProps('test-form', 'one', activeTab)}>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </section>
      <section {...modalTabPanelProps('test-form', 'two', activeTab)}>
        <input aria-label="Amount" type="number" max={10} defaultValue="" required />
      </section>
      <section {...modalTabPanelProps('test-form', 'three', activeTab)}>{activeTab === 'three' && <Loader />}</section>
    </TabbedModal>
  );
};

describe('TabbedModal', () => {
  it('shows one part at a time, numbered, with Back / Next and markers, keeping typed values', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const dialog = screen.getByRole('dialog', { name: 'Test form' });
    const tabs = within(within(dialog).getByRole('tablist', { name: 'Test sections' })).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(within(dialog).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Back/ })).toBeDisabled();
    expect(within(tabs[0]).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();

    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Rudra');
    expect(within(tabs[0]).getByRole('img', { name: 'done' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Next/ }));
    expect(within(dialog).getByText('Step 2 of 3')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: 'Amount' })).toBeVisible();

    // The arrow keys move between parts
    tabs[1].focus();
    await user.keyboard('{ArrowDown}');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(within(dialog).getByRole('button', { name: /Next/ })).toBeDisabled();

    await user.click(tabs[0]);
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Rudra');
  });

  it('renders a part that loads data only while it is open', async () => {
    const user = userEvent.setup();
    const loads = vi.fn();
    render(<Form loads={loads} />);
    expect(loads).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: /Third part/ }));
    expect(screen.getByText('Loaded')).toBeInTheDocument();
    expect(loads).toHaveBeenCalled();
  });

  it('opens the part holding a field the browser refuses on save', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Form onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /Second part/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('starts again on the first part when another record is opened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Form recordId={1} />);
    await user.click(screen.getByRole('tab', { name: /Second part/ }));
    rerender(<Form recordId={2} />);
    expect(screen.getByRole('tab', { name: /First part/ })).toHaveAttribute('aria-selected', 'true');
  });
});
