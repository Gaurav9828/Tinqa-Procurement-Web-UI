import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../config/endpointAccess';
import { clientDemoApi } from './api/clientDemoApi';
import { ClientDemoWizardPage } from './pages/ClientDemoWizardPage';
import { ClientDemoDetailPage } from './pages/ClientDemoDetailPage';
import type { DemoDetail, DemoExpense, DemoStatus, DemoUnit, DemoVisit } from './types/clientDemo.types';
import { todayIso } from './utils/clientDemo';
import { productApi } from '../products-management/api/productsApi';
import { clearPincodeCache } from '../../utils/pincode';
import type { ProductResponse } from '../products-management/types/product.types';

// Only the network layer is mocked.
vi.mock('./api/clientDemoApi', () => ({
  clientDemoApi: {
    list: vi.fn(),
    waiting: vi.fn(),
    staff: vi.fn(),
    mine: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    submit: vi.fn(),
    complete: vi.fn(),
    withdraw: vi.fn(),
    cancel: vi.fn(),
    decide: vi.fn(),
    reopen: vi.fn(),
    addExpense: vi.fn(),
    updateExpense: vi.fn(),
    removeExpense: vi.fn(),
    attachInvoice: vi.fn(),
    invoice: vi.fn(),
    unitOptions: vi.fn(),
    unitLookup: vi.fn(),
    handOut: vi.fn(),
    handBack: vi.fn(),
    writeOff: vi.fn(),
  },
}));

vi.mock('../products-management/api/productsApi', () => ({
  productApi: { getActiveProducts: vi.fn() },
}));

const api = vi.mocked(clientDemoApi);
const products = vi.mocked(productApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 1, username: 'fin', email: 'fin@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const MANAGER: Permission[] = ['DEMO_VIEW', 'DEMO_MANAGE'];
const APPROVER: Permission[] = ['DEMO_VIEW', 'DEMO_MANAGE', 'DEMO_APPROVE'];
const ATTENDEE: Permission[] = ['DEMO_VIEW_OWN', 'DEMO_EXPENSE_RECORD_OWN'];

const STAFF = [
  { employeeId: 11, employeeCode: 'EMP-0011', name: 'Asha Verma', designation: 'Store Sales Agent' },
  { employeeId: 12, employeeCode: 'EMP-0012', name: 'Ravi Kumar', designation: 'Delivery Rider / Courier' },
];

const bill = (id: number, extra: Partial<DemoExpense> = {}): DemoExpense => ({
  id, kind: 'STAY', dayNumber: 1, date: '2030-05-10', vendorName: 'Hotel Pearl', vendorAddress: null, vendorMapLink: null,
  vendorPhone: null, vendorGstin: '08AAAAA0000A1Z5', mealType: null, fromPlace: null, toPlace: null, travelMode: null,
  startDate: null, startTime: null, endDate: null, endTime: null, referenceNumber: 'INV-7', amount: 3500, gstAmount: 420, description: null, reason: null, invoiceFileName: null, addedBy: 9,
  addedByName: 'Planner', addedAt: '', updatedByName: null, updatedAt: null, editableByYou: false, ...extra,
});

const visit = (extra: Partial<DemoVisit> = {}): DemoVisit => ({
  id: 70, clientCategory: 'HOTEL', clientCategoryLabel: 'Hotel', clientCategoryOther: null, clientName: 'Hotel Sunrise',
  legalName: null, gstin: null, clientPhone: '+919811111111', clientEmail: null, contactPerson: 'Asha Rao', contactPhone: '+919876543210', contactEmail: null,
  addressLine: '12 MG Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', mapLink: null, dayNumber: 1, date: '2030-05-10',
  startTime: '10:30:00', endTime: '12:30:00', ...extra,
});

const demo = (status: DemoStatus, extra: Partial<DemoDetail> = {}): DemoDetail => ({
  id: 7, reference: 'DEMO-00007', demoType: 'APPOINTMENT', status, statusLabel: status, clientCategory: 'HOTEL',
  clientCategoryLabel: 'Hotel', clientCategoryOther: null, clientName: 'Hotel Sunrise', contactPerson: 'Asha Rao',
  contactPhone: '+919876543210', contactEmail: null, addressLine: '12 MG Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001',
  mapLink: null, startDate: '2020-05-10', startTime: '10:30:00', numberOfDays: 2, endDate: '2020-05-11', proposedBudget: 20000,
  extraBudget: 16500, extraBudgetReason: 'Local transport',
  purpose: null, outcome: null, clients: [visit()], products: [], units: [], handlesUnits: false, writesOffUnits: false, staff: [STAFF[1]], expenses: [bill(1)], totalsByKind: { STAY: 3500, FOOD: 0, TRAVEL: 0, OTHER: 0 },
  total: 3500, budgetLeft: 16500, bookedTotal: 0, createdBy: 9, createdByName: 'Planner', createdAt: '', submittedByName: 'Planner',
  submittedAt: '', decidedByName: null, decidedAt: null, rejectionReason: null, cancelReason: null, reopenReason: null,
  completedAt: null, events: [], decidableByYou: false, attendingYou: false, ...extra,
});

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/client-demos" element={<p>Demo list</p>} />
          <Route path="/client-demos/new" element={<ClientDemoWizardPage />} />
          <Route path="/client-demos/:id/edit" element={<ClientDemoWizardPage />} />
          <Route path="/client-demos/:id" element={<ClientDemoDetailPage mode="manager" />} />
          <Route path="/my-demos/:id" element={<ClientDemoDetailPage mode="attendee" />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.staff.mockResolvedValue(ok(STAFF));
  products.getActiveProducts.mockResolvedValue([
    { id: 41, title: 'Smart Lock X1', category: { id: 1, name: 'Locks', slug: 'locks', sortOrder: 1 } },
    { id: 42, title: 'Door Sensor', category: null },
  ] as ProductResponse[]);
});

const card = (name: string) => screen.getByRole('article', { name });
const drag = () => ({ effectAllowed: '', dropEffect: '', setData: vi.fn(), setDragImage: vi.fn() });

// Opens a time's round clock, on the half of the day of `hour` ("6 pm")
const openClock = async (user: ReturnType<typeof userEvent.setup>, field: HTMLElement) => {
  await user.click(field);
  return screen.getByRole('dialog', { name: /clock$/ });
};
const half = async (user: ReturnType<typeof userEvent.setup>, clock: HTMLElement, hour: string) => {
  const toggle = within(clock).getByRole('button', { name: hour.slice(-2) });
  if (toggle.getAttribute('aria-pressed') !== 'true') await user.click(toggle);
};
// Picks a time on an open clock: the hour ("6 pm"), then the exact minute ("6:00 pm")
const pickOn = async (user: ReturnType<typeof userEvent.setup>, clock: HTMLElement, hour: string, minute: string) => {
  await half(user, clock, hour);
  await user.click(within(clock).getByRole('button', { name: hour }));
  await user.click(within(clock).getByRole('button', { name: minute }));
};
// Picks a time on the clock: the hour ("6 pm"), then the exact minute ("6:00 pm")
const pickTime = async (user: ReturnType<typeof userEvent.setup>, field: HTMLElement, hour: string, minute: string) => {
  const clock = await openClock(user, field);
  await half(user, clock, hour);
  await user.click(within(clock).getByRole('button', { name: hour }));
  await user.click(within(clock).getByRole('button', { name: minute }));
};

describe('Client demos: scheduling step by step', () => {
  it('plans several clients at their own times, the products and the day-by-day travel, stay and meals, then sends the quotation', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    const created = demo('DRAFT', { expenses: [
      bill(30, { kind: 'TRAVEL', fromPlace: 'Delhi', toPlace: 'Jaipur', travelMode: 'BUS' }),
      bill(31),
      bill(32, { kind: 'FOOD', mealType: 'DINNER', vendorName: 'Spice Court' }),
    ] });
    api.create.mockResolvedValue(ok(created));
    api.attachInvoice.mockResolvedValue(ok(created));
    api.submit.mockResolvedValue(ok(demo('QUOTATION_PENDING')));
    api.get.mockResolvedValue(ok(demo('QUOTATION_PENDING')));
    renderAt('/client-demos/new');

    // Nothing moves on until the clients step is complete
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));
    expect(await screen.findByText('Choose the date.')).toBeInTheDocument();
    expect(screen.getByText('Choose what kind of place the client is.')).toBeInTheDocument();
    expect(screen.getByText('Contact phone is required.')).toBeInTheDocument();
    expect(screen.getByText('The client’s own phone is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Start date'), '2030-05-10');
    await user.clear(screen.getByLabelText('Number of days'));
    await user.type(screen.getByLabelText('Number of days'), '2');
    const first = card('Client 1');
    // A hotel may carry its legal details; a public place doesn't
    await user.click(within(first).getByRole('radio', { name: 'Public Place' }));
    expect(within(first).queryByLabelText('GSTIN')).not.toBeInTheDocument();
    await user.click(within(first).getByRole('radio', { name: 'Hotel' }));
    await user.type(within(first).getByLabelText('Client name'), 'Hotel Sunrise');
    await user.type(within(first).getByLabelText('GSTIN'), '08aaaaa0000a1z5');
    await user.type(within(first).getByLabelText('Client phone'), '+919414012345');
    await user.type(within(first).getByLabelText('Client email'), 'desk@sunrise.example');
    await user.type(within(first).getByLabelText('Contact phone'), '+919876543210');
    await user.type(within(first).getByLabelText('Address'), '12 MG Road');
    await user.type(within(first).getByLabelText('PIN code'), '302001');
    await user.type(within(first).getByLabelText('City'), 'Jaipur');

    // A second client starts when the first one ends
    await user.click(screen.getByRole('button', { name: /Add another client/ }));
    const second = card('Client 2');
    expect(within(second).getByLabelText('From')).toHaveTextContent('1:00 pm');
    expect(within(second).getByLabelText('To')).toHaveTextContent('4:00 pm');
    await user.click(within(second).getByRole('radio', { name: 'Hospital' }));
    await user.type(within(second).getByLabelText('Client name'), 'City Care Hospital');
    await user.type(within(second).getByLabelText('Client phone'), '+919812345678');
    // The same contact person helps at both
    await user.type(within(second).getByLabelText('Contact phone'), '+919876543210');
    await user.type(within(second).getByLabelText('Address'), '4 Park Street');
    await user.type(within(second).getByLabelText('PIN code'), '302001');
    await user.type(within(second).getByLabelText('City'), 'Jaipur');
    await user.selectOptions(within(card('Client 2')).getByLabelText('Day'), '2');
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));

    // Visit: type, each unit of the products shown by its barcode, and at least one attending staff member
    api.unitOptions.mockResolvedValue(ok([
      { barcode: 'SL-0001', productId: 41, productTitle: 'Smart Lock X1', status: 'IN_STOCK', statusLabel: 'in stock', inStockSince: null,
        available: true, heldBy: null, note: null },
      { barcode: 'SL-0002', productId: 41, productTitle: 'Smart Lock X1', status: 'IN_STOCK', statusLabel: 'in stock', inStockSince: null,
        available: false, heldBy: 'DEMO-00003', note: 'Taken by DEMO-00003 on these days' },
    ]));
    await user.click(await screen.findByRole('radio', { name: /Promotion/ }));
    await user.click(await screen.findByRole('button', { name: /Smart Lock X1/ }));
    // A product without its units' barcodes can't go
    await user.click(screen.getByRole('button', { name: /Next: Quotation/ }));
    expect(await screen.findByText('Pick the barcode of each unit you take.')).toBeInTheDocument();
    // Its units in stock for the trip's days: one is taken by another demo then
    expect(await screen.findByText('Taken by DEMO-00003 on these days')).toBeInTheDocument();
    expect(api.unitOptions).toHaveBeenCalledWith(41, '2030-05-10', 2, null);
    expect(screen.getByLabelText('Unit SL-0002')).toBeDisabled();
    await user.click(screen.getByLabelText('Unit SL-0001'));
    // Or scan a unit's barcode: its product comes with it
    api.unitLookup.mockResolvedValue(ok({ barcode: 'DS-0009', productId: 42, productTitle: 'Door Sensor', status: 'IN_STOCK',
      statusLabel: 'in stock', inStockSince: null, available: true, heldBy: null, note: null }));
    await user.type(screen.getByLabelText('Scan or type a barcode'), 'ds-0009{Enter}');
    await waitFor(() => expect(api.unitLookup).toHaveBeenCalledWith('DS-0009', '2030-05-10', 2, null));
    expect(await screen.findByRole('list', { name: 'Barcodes of Door Sensor' })).toHaveTextContent('DS-0009');
    await user.type(screen.getByLabelText('Scan or type a barcode'), 'sl-0001{Enter}');
    expect(screen.getByText('SL-0001 is already picked.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next: Quotation/ }));
    expect(await screen.findByText('Tag at least one attending staff member.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Asha Verma/ }));
    await user.click(screen.getByRole('button', { name: /Next: Quotation/ }));

    // Quotation: a section per day; an overnight journey arrives the next day
    expect(await screen.findByRole('region', { name: 'Day 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add travel on day 1' }));
    const bus = screen.getByRole('group', { name: 'Travel 1 · day 1' });
    await user.selectOptions(within(bus).getByLabelText('Travel by'), 'BUS');
    await user.type(within(bus).getByLabelText('From'), 'Delhi');
    await user.type(within(bus).getByLabelText('To'), 'Jaipur');
    expect(within(bus).getByLabelText('Departure')).toHaveTextContent(/10 May/);
    // Departure and arrival are one range: a day from the strip, then the time on a round clock, the hour then the
    // exact minute. The visit to Hotel Sunrise (10 am – 1 pm) already takes that time on day 1: it is shaded grey and
    // can't be picked
    const clock = await openClock(user, within(bus).getByLabelText('Departure'));
    expect(within(clock).getByRole('radio', { name: '10 May 2030' })).toBeChecked();
    expect(within(clock).getByRole('list', { name: 'Already taken this day' })).toHaveTextContent('10:00 am – 1:00 pm · Visit to Hotel Sunrise');
    expect(within(clock).getByRole('button', { name: '10 am' })).toBeDisabled();
    expect(within(clock).getByRole('button', { name: '9 am' })).toBeEnabled();
    await user.click(within(clock).getByRole('button', { name: '9 am' }));
    expect(within(clock).getByRole('button', { name: '9:59 am' })).toBeEnabled();
    // A departure at 9:30 am moves on to the arrival, which can't be after 10 am, as it would run into the visit
    await user.click(within(clock).getByRole('button', { name: '9:30 am' }));
    expect(within(clock).getByRole('tab', { name: /Arrival/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(within(clock).getByRole('button', { name: '9 am' }));
    expect(within(clock).getByRole('button', { name: '9:47 am' })).toBeEnabled();
    expect(within(clock).getByRole('button', { name: '9:30 am' })).toBeDisabled();
    await user.click(within(clock).getByRole('button', { name: 'am' }));
    expect(within(clock).getByRole('button', { name: '11 am' })).toBeDisabled();
    // On the same day an arrival can't be before the departure; arriving the next day is picked from the strip
    await user.click(within(clock).getByRole('tab', { name: /Departure/ }));
    await pickOn(user, clock, '6 pm', '6:00 pm');
    await half(user, clock, '5 pm');
    expect(within(clock).getByRole('button', { name: '5 pm' })).toBeDisabled();
    await user.click(within(clock).getByRole('radio', { name: '11 May 2030' }));
    await pickOn(user, clock, '6 am', '6:00 am');
    expect(screen.queryByRole('dialog', { name: /clock$/ })).not.toBeInTheDocument();
    expect(within(bus).getByText(/Arrival on 11 May 2030, the next day/)).toBeInTheDocument();
    expect(within(bus).getByText('12 h')).toBeInTheDocument();
    await user.type(within(bus).getByLabelText('Expected amount (₹)'), '1200');
    // A day takes more than one journey: the first keeps what was entered, and the next departs when it arrives or later
    await user.click(screen.getByRole('button', { name: 'Add another travel on day 1' }));
    expect(screen.getByRole('group', { name: 'Travel 1 · day 1' })).toBe(bus);
    expect(within(bus).getByLabelText('From')).toHaveValue('Delhi');
    expect(within(bus).getByLabelText('Departure')).toHaveTextContent(/10 May · 6:00 pm/);
    expect(within(bus).getByLabelText('Arrival')).toHaveTextContent(/11 May · 6:00 am/);
    const next = screen.getByRole('group', { name: 'Travel 2 · day 1' });
    expect(within(next).getByLabelText('Departure')).toHaveTextContent(/11 May/);
    expect(within(next).getByText(/Departs from when the journey before arrives \(11 May 2030, 6:00 am\)/)).toBeInTheDocument();
    const departure = within(await openClock(user, within(next).getByLabelText('Departure')));
    await user.click(departure.getByRole('button', { name: '6 am' }));
    expect(departure.getByRole('button', { name: '6:00 am' })).toBeEnabled();
    await user.click(departure.getByRole('button', { name: 'am' }));
    expect(departure.getByRole('button', { name: '5 am' })).toBeDisabled();
    await user.keyboard('{Escape}');
    // A card moves on its day by its handle, with ↑ ↓ or by dragging: Travel 2 becomes Travel 1, and back
    within(next).getByRole('button', { name: 'Move travel 2 of day 1, place 2 of 2' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('group', { name: 'Travel 1 · day 1' })).toBe(next);
    expect(screen.getByRole('group', { name: 'Travel 2 · day 1' })).toBe(bus);
    fireEvent.dragStart(within(bus).getByRole('button', { name: 'Move travel 2 of day 1, place 2 of 2' }), { dataTransfer: drag() });
    fireEvent.dragOver(next.parentElement as HTMLElement, { dataTransfer: drag() });
    fireEvent.drop(next.parentElement as HTMLElement, { dataTransfer: drag() });
    expect(screen.getByRole('group', { name: 'Travel 1 · day 1' })).toBe(bus);
    await user.click(screen.getByRole('button', { name: 'Remove travel 2 of day 1' }));

    // The night on day 1 is at the hotel visited that day, filled in from it, checking out the next morning
    await user.click(screen.getByRole('button', { name: 'Add night stay on day 1' }));
    const stay = screen.getByRole('group', { name: 'Night stay · day 1' });
    expect(within(stay).getByLabelText('Hotel name')).toHaveValue('Hotel Sunrise');
    expect(within(stay).getByLabelText('Hotel GSTIN')).toHaveValue('08aaaaa0000a1z5');
    expect(within(stay).getByLabelText('Hotel phone')).toHaveValue('+919414012345');
    expect(within(stay).getByLabelText('Hotel name')).toHaveAttribute('readonly');
    expect(within(stay).getByLabelText('Check-in')).toHaveTextContent(/10 May/);
    expect(within(stay).getByLabelText('Check-out')).toHaveTextContent(/11 May/);
    await user.type(within(stay).getByLabelText('Expected amount (₹)'), '3200');
    const invoice = new File(['%PDF'], 'sunrise.pdf', { type: 'application/pdf' });
    await user.upload(within(stay).getByLabelText('Invoice of night stay day 1'), invoice);
    await user.click(screen.getByRole('button', { name: 'Add dinner on day 1' }));
    const dinner = screen.getByRole('group', { name: 'Dinner · day 1' });
    await user.type(within(dinner).getByLabelText('Restaurant / place'), 'Spice Court');
    await user.type(within(dinner).getByLabelText('Expected amount (₹)'), '600');

    // The budget is the day-by-day total plus an extra, which needs its reason
    expect(screen.getByLabelText('Day-by-day total')).toHaveTextContent('5,000.00');
    await user.type(screen.getByLabelText('Extra budget (₹)'), '1000');
    expect(screen.getByLabelText('Total proposed budget')).toHaveTextContent('6,000.00');
    await user.click(screen.getByRole('button', { name: /Next: Review/ }));
    expect(await screen.findByText(/Say why the extra is needed/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Why the extra .* is needed/), 'Local cabs 600, parking 400');
    await user.click(screen.getByRole('button', { name: /Next: Review/ }));

    expect(await screen.findByText('2 clients to visit')).toBeInTheDocument();
    expect(screen.getByText('Smart Lock X1 × 1 (SL-0001); Door Sensor × 1 (DS-0009)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save & send for approval/ }));

    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(7));
    const payload = api.create.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      demoType: 'PROMOTION', startDate: '2030-05-10', numberOfDays: 2, proposedBudget: 6000, extraBudgetReason: 'Local cabs 600, parking 400', staffEmployeeIds: [11],
      products: [
        { productId: 41, productName: 'Smart Lock X1', quantity: 1, barcodes: ['SL-0001'] },
        { productId: 42, productName: 'Door Sensor', quantity: 1, barcodes: ['DS-0009'] },
      ],
    }));
    expect(payload.clients).toEqual([
      expect.objectContaining({ clientCategory: 'HOTEL', clientName: 'Hotel Sunrise', gstin: '08AAAAA0000A1Z5', clientPhone: '+919414012345',
        clientEmail: 'desk@sunrise.example', dayNumber: 1, startTime: '10:00', endTime: '13:00' }),
      expect.objectContaining({ clientCategory: 'HOSPITAL', clientName: 'City Care Hospital', dayNumber: 2 }),
    ]);
    expect(payload.plannedBills).toEqual([
      expect.objectContaining({ id: null, kind: 'TRAVEL', dayNumber: 1, travelMode: 'BUS', fromPlace: 'Delhi', toPlace: 'Jaipur',
        startDate: '2030-05-10', startTime: '18:00', endDate: '2030-05-11', endTime: '06:00', amount: 1200 }),
      expect.objectContaining({ id: null, kind: 'STAY', dayNumber: 1, vendorName: 'Hotel Sunrise', vendorGstin: '08AAAAA0000A1Z5',
        startDate: '2030-05-10', startTime: '21:00', endDate: '2030-05-11', endTime: '08:00', amount: 3200 }),
      expect.objectContaining({ id: null, kind: 'FOOD', mealType: 'DINNER', dayNumber: 1, vendorName: 'Spice Court', amount: 600 }),
    ]);
    // The stay's invoice goes onto the bill the save created for it
    expect(api.attachInvoice).toHaveBeenCalledWith('manager', 7, 31, invoice);
    expect(api.attachInvoice).toHaveBeenCalledTimes(1);
    // Then the saved demo opens
    expect(await screen.findByRole('heading', { name: /Hotel Sunrise/ })).toBeInTheDocument();
  });

  it('never visits the same client twice in a row on a day, matched by the client phone', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    renderAt('/client-demos/new');
    const fillClient = async (name: string, kind: string, client: string, phone: string, from: [string, string], to: [string, string]) => {
      const article = card(name);
      await user.click(within(article).getByRole('radio', { name: kind }));
      await user.type(within(article).getByLabelText('Client name'), client);
      await user.type(within(article).getByLabelText('Client phone'), phone);
      await user.type(within(article).getByLabelText('Contact phone'), '+919876543210');
      await user.type(within(article).getByLabelText('Address'), '12 MG Road');
      await user.type(within(article).getByLabelText('PIN code'), '302001');
      await user.type(within(article).getByLabelText('City'), 'Jaipur');
      await pickTime(user, within(article).getByLabelText('From'), ...from);
      await pickTime(user, within(article).getByLabelText('To'), ...to);
    };

    await user.type(await screen.findByLabelText('Start date'), '2030-05-10');
    await fillClient('Client 1', 'Hotel', 'Hotel Sunrise', '+919811111111', ['10 am', '10:00 am'], ['12 pm', '12:00 pm']);
    await user.click(screen.getByRole('button', { name: /Add another client/ }));
    // Another name, the same number written another way
    await fillClient('Client 2', 'Hotel', 'Sunrise Residency', '09811111111', ['1 pm', '1:00 pm'], ['3 pm', '3:00 pm']);
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));
    expect(await within(card('Client 2')).findByText(/visited twice in a row on day 1.*one visit from 10:00 am to 3:00 pm, or visit another client in between/))
      .toBeInTheDocument();

    // Another client in between makes it two visits
    await user.click(screen.getByRole('button', { name: /Add another client/ }));
    await fillClient('Client 3', 'Hospital', 'City Care Hospital', '+919812345678', ['12 pm', '12:15 pm'], ['12 pm', '12:45 pm']);
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));
    expect(await screen.findByRole('radio', { name: /Promotion/ })).toBeInTheDocument();
  });

  it('fills the city and state from the PIN code, and a new PIN code replaces them', async () => {
    clearPincodeCache();
    const indiaPost = (district: string, state: string) =>
      new Response(JSON.stringify([{ Status: 'Success', PostOffice: [{ Name: 'Head Office', District: district, State: state }] }]));
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).endsWith('/302001') ? indiaPost('Jaipur', 'Rajasthan') : indiaPost('Bangalore', 'Karnataka'));
    signIn(MANAGER);
    const user = userEvent.setup();
    renderAt('/client-demos/new');
    const first = await screen.findByRole('article', { name: 'Client 1' });

    // Where the client is sits with its own details, before the contact person
    const labels = within(first).getAllByRole('textbox').map((input) => input.getAttribute('aria-label'));
    expect(labels.indexOf('PIN code')).toBeLessThan(labels.indexOf('Contact person'));
    expect(labels.indexOf('Address')).toBeGreaterThan(labels.indexOf('Client email'));

    await user.type(within(first).getByLabelText('PIN code'), '302001');
    await waitFor(() => expect(within(first).getByLabelText('City')).toHaveValue('Jaipur'));
    expect(within(first).getByLabelText('State')).toHaveValue('Rajasthan');
    expect(within(first).getByLabelText('City')).toHaveAttribute('readonly');

    await user.clear(within(first).getByLabelText('PIN code'));
    await user.type(within(first).getByLabelText('PIN code'), '560001');
    await waitFor(() => expect(within(first).getByLabelText('City')).toHaveValue('Bangalore'));
    expect(within(first).getByLabelText('State')).toHaveValue('Karnataka');
  });

  it('changes a saved quotation in one save, with the reason, once it is approved', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('APPROVED', {
      startDate: '2030-05-10', endDate: '2030-05-11',
      extraBudget: 13000,
      expenses: [
        bill(1, { startDate: '2030-05-10', startTime: '21:00:00', endDate: '2030-05-11', endTime: '06:00:00', editableByYou: true }),
        bill(2, { kind: 'TRAVEL', fromPlace: 'Delhi', toPlace: 'Jaipur', travelMode: 'TRAIN', vendorName: null, vendorGstin: null }),
        bill(3, { kind: 'OTHER', dayNumber: null, description: 'Parking', reason: 'None at the hotel', amount: 100 }),
      ],
    })));
    api.update.mockResolvedValue(ok(demo('APPROVED')));
    renderAt('/client-demos/7/edit');

    // Saved steps are complete, so the quotation opens straight away
    await user.click(await screen.findByRole('button', { name: /Budget, day by day/ }));
    const stay = await screen.findByRole('group', { name: 'Night stay · day 1' });
    // A hotel that isn't a client of the trip is typed in
    expect(within(stay).getByLabelText('Hotel name')).toHaveValue('Hotel Pearl');
    expect(within(stay).getByLabelText('Check-out')).toHaveTextContent(/11 May · 6:00 am/);
    // The budget opens as approved: 7,000 day by day and 13,000 extra
    expect(screen.getByLabelText('Extra budget (₹)')).toHaveValue('13000');
    expect(screen.getByLabelText(/Why the extra/)).toHaveValue('Local transport');
    await user.clear(within(stay).getByLabelText('Expected amount (₹)'));
    await user.type(within(stay).getByLabelText('Expected amount (₹)'), '3000');
    await user.click(screen.getByRole('button', { name: /Next: Review/ }));
    expect(await screen.findByText(/goes back for approval/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Give a reason for changing an approved demo.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason for the change'), 'Hotel gave a discount');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.update).toHaveBeenCalled());
    const [id, payload] = api.update.mock.calls[0];
    expect(id).toBe(7);
    expect(payload.changeReason).toBe('Hotel gave a discount');
    expect(payload.proposedBudget).toBe(19500);
    expect(payload.extraBudgetReason).toBe('Local transport');
    // The stay and the travel are in the plan (other bills stay on the demo); the stay keeps its invoice number and GST,
    // and the journey recorded without times stays without
    expect(payload.plannedBills).toEqual([
      expect.objectContaining({ id: 2, kind: 'TRAVEL', fromPlace: 'Delhi', toPlace: 'Jaipur', travelMode: 'TRAIN', startDate: null, startTime: null }),
      expect.objectContaining({ id: 1, kind: 'STAY', amount: 3000, referenceNumber: 'INV-7', gstAmount: 420, startDate: '2030-05-10', startTime: '21:00',
        endDate: '2030-05-11', endTime: '06:00' }),
    ]);
    expect(api.attachInvoice).not.toHaveBeenCalled();
  });
});

describe('Client demos: deciding and recording bills', () => {
  it('lets an approver who did not plan it approve the completion, which books the bills', async () => {
    signIn(APPROVER);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('COMPLETION_PENDING', { decidableByYou: true })));
    api.decide.mockResolvedValue(ok(demo('COMPLETED', { bookedTotal: 3500 }), 'Completion approved and booked to the company account.'));
    renderAt('/client-demos/7');

    await user.click(await screen.findByRole('button', { name: 'Approve completion' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve the completion?' });
    expect(within(dialog).getByText(/is booked as travel & conveyance/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(api.decide).toHaveBeenCalledWith(7, 'APPROVED', null));
    expect(await screen.findByText('Completion approved and booked to the company account.')).toBeInTheDocument();
  });

  it('never offers a decision on a demo you planned, and rejecting needs a reason', async () => {
    signIn(APPROVER);
    api.get.mockResolvedValue(ok(demo('QUOTATION_PENDING', { decidableByYou: false })));
    renderAt('/client-demos/7');

    expect(await screen.findByText(/someone else decides on it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve quotation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('lets attending staff add their own food bill, checking the meal first', async () => {
    signIn(ATTENDEE);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('APPROVED', { attendingYou: true })));
    api.addExpense.mockResolvedValue(ok(demo('APPROVED', { expenses: [bill(1), bill(2, { kind: 'FOOD', mealType: 'LUNCH', vendorName: 'Spice Court', amount: 450 })] })));
    renderAt('/my-demos/7');

    // Attendees record bills; they don't run the workflow
    expect(await screen.findByRole('button', { name: 'Add bill' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send for completion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change bill' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add bill' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a bill' });
    await user.click(within(dialog).getByRole('radio', { name: /Food/ }));
    await user.selectOptions(within(dialog).getByLabelText('Day'), '1');
    await user.type(within(dialog).getByLabelText('Restaurant name'), 'Spice Court');
    await user.type(within(dialog).getByLabelText('Amount (₹, incl. GST)'), '450');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    expect(within(dialog).getByText('Choose the meal.')).toBeInTheDocument();
    expect(api.addExpense).not.toHaveBeenCalled();

    await user.selectOptions(within(dialog).getByLabelText('Meal'), 'LUNCH');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    await waitFor(() => expect(api.addExpense).toHaveBeenCalledWith('attendee', 7, expect.objectContaining({
      kind: 'FOOD', dayNumber: 1, mealType: 'LUNCH', vendorName: 'Spice Court', amount: 450,
    })));
  });

  it('lets attending staff hand the demo units out by scanning them on the day, and back afterwards', async () => {
    signIn([...ATTENDEE, 'DEMO_UNITS_HANDLE_OWN']);
    const user = userEvent.setup();
    const unit = (barcode: string, status: DemoUnit['status']): DemoUnit => ({
      barcode, productId: 41, productName: 'Smart Lock X1', status, statusLabel: status, handedOutAt: status === 'OUT' ? '2030-05-10T05:00:00Z' : null,
      handedOutByName: status === 'OUT' ? 'Ravi Kumar' : null, returnedAt: null, returnedByName: null, writeOffReason: null,
    });
    const today = todayIso();
    const running = (units: DemoUnit[]) => demo('APPROVED', { attendingYou: true, startDate: today, endDate: today, numberOfDays: 1,
      handlesUnits: true, units, products: [{ productId: 41, productName: 'Smart Lock X1', quantity: 2, barcodes: units.map((u) => u.barcode) }] });
    api.get.mockResolvedValue(ok(running([unit('SL-0001', 'RESERVED'), unit('SL-0002', 'RESERVED')])));
    api.handOut.mockResolvedValue(ok(running([unit('SL-0001', 'OUT'), unit('SL-0002', 'RESERVED')])));
    api.handBack.mockResolvedValue(ok(running([unit('SL-0001', 'RETURNED'), unit('SL-0002', 'RESERVED')])));
    renderAt('/my-demos/7');

    const units = await screen.findByRole('region', { name: 'Units taken' });
    // A unit not picked for the demo is refused
    await user.type(within(units).getByLabelText('Scan a unit'), 'XX-9999{Enter}');
    expect(within(units).getByText('XX-9999 is not picked for DEMO-00007.')).toBeInTheDocument();
    await user.clear(within(units).getByLabelText('Scan a unit'));
    await user.type(within(units).getByLabelText('Scan a unit'), 'sl-0001{Enter}');
    expect(within(units).getByLabelText('Select SL-0001')).toBeChecked();
    expect(within(units).getByRole('button', { name: 'Hand back' })).toBeDisabled();
    await user.click(within(units).getByRole('button', { name: 'Hand out 1' }));
    await waitFor(() => expect(api.handOut).toHaveBeenCalledWith('attendee', 7, ['SL-0001']));

    await user.click(await within(units).findByLabelText('Select SL-0001'));
    await user.click(within(units).getByRole('button', { name: 'Hand back 1' }));
    await waitFor(() => expect(api.handBack).toHaveBeenCalledWith('attendee', 7, ['SL-0001']));
    // Writing a unit off is a Super Admin's, never shown here
    expect(within(units).queryByRole('button', { name: 'Write off' })).not.toBeInTheDocument();
  });

  it('asks why a recorded bill changes once the quotation is approved', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('APPROVED', { expenses: [bill(1, { editableByYou: true })] })));
    api.updateExpense.mockResolvedValue(ok(demo('APPROVED')));
    renderAt('/client-demos/7');

    await user.click(await screen.findByRole('button', { name: 'Change bill' }));
    const dialog = screen.getByRole('dialog', { name: 'Change stay bill' });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Give a reason for changing a recorded bill.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Reason for the change'), 'Corrected invoice');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateExpense).toHaveBeenCalledWith('manager', 7, 1, expect.objectContaining({ changeReason: 'Corrected invoice' })));
  });
});

describe('Client demos: endpoint permissions', () => {
  it('lists the permission of every demo endpoint, as the backend requires it', () => {
    const required = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
    expect(required('GET', '/v1/admin/client-demos')).toBe('DEMO_VIEW');
    expect(required('GET', '/v1/admin/client-demos/waiting')).toBe('DEMO_APPROVE');
    expect(required('GET', '/v1/admin/client-demos/staff')).toBe('DEMO_MANAGE');
    expect(required('POST', '/v1/admin/client-demos/7/decision')).toBe('DEMO_APPROVE');
    expect(required('POST', '/v1/admin/client-demos/7/reopen')).toBe('DEMO_COMPLETED_EDIT');
    expect(required('POST', '/v1/client-demos/mine/7/expenses')).toBe('DEMO_EXPENSE_RECORD_OWN');
    expect(required('GET', '/v1/client-demos/mine/7/expenses/3/invoice')).toBe('DEMO_VIEW_OWN');
    expect(required('GET', '/v1/admin/client-demos/units')).toBe('DEMO_MANAGE');
    expect(required('GET', '/v1/admin/client-demos/units/lookup')).toBe('DEMO_MANAGE');
    expect(required('POST', '/v1/admin/client-demos/7/units/hand-out')).toBe('DEMO_MANAGE');
    expect(required('POST', '/v1/admin/client-demos/7/units/write-off')).toBe('DEMO_UNIT_WRITE_OFF');
    expect(required('POST', '/v1/client-demos/mine/7/units/hand-back')).toBe('DEMO_UNITS_HANDLE_OWN');
  });
});
