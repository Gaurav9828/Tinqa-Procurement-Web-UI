import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
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
import { APP_NAVIGATION } from '../../config/permissions.config';
import { meetingApi } from './api/meetingApi';
import { clientDemoApi } from '../client-demos/api/clientDemoApi';
import { ClientDemosPage } from '../client-demos/pages/ClientDemosPage';
import { MeetingEditorPage } from './pages/MeetingEditorPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { MeetingFeedbackPage } from './pages/MeetingFeedbackPage';
import { MyMeetingsPage } from './pages/MyMeetingsPage';
import { decrementPendingFeedbackCount, setPendingFeedbackCount, usePendingFeedbackCount } from './hooks/useMeetingData';
import type { Attendee, BusySlot, Meeting, MeetingPage } from './types/meeting.types';
import { emptyMeetingForm, meetingPayload, validateMeetingForm } from './utils/meetingForm';
import { toOffsetIso } from './utils/meeting';
import { addDays, todayIso } from '../client-demos/utils/clientDemo';

// Only the network layer is mocked.
vi.mock('./api/meetingApi', () => ({
  MEETING_PAGE_SIZE: 20,
  meetingApi: {
    list: vi.fn(),
    mine: vi.fn(),
    get: vi.fn(),
    invitableStaff: vi.fn(),
    busy: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addAttendees: vi.fn(),
    cancel: vi.fn(),
    complete: vi.fn(),
    decline: vi.fn(),
    myFeedback: vi.fn(),
    submitFeedback: vi.fn(),
    allFeedback: vi.fn(),
  },
}));
vi.mock('../client-demos/api/clientDemoApi', () => ({ clientDemoApi: { list: vi.fn() } }));

const api = vi.mocked(meetingApi);
const demos = vi.mocked(clientDemoApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });
const pageOf = <T,>(content: T[]): MeetingPage<T> => ({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 });

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 1, username: 'asha', email: 'asha@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const SELF: Permission[] = ['MEETING_VIEW_OWN', 'MEETING_RESPOND_OWN'];
const ORGANISER: Permission[] = ['MEETING_VIEW_ALL', 'MEETING_SCHEDULE', ...SELF];

const STAFF = [
  { employeeId: 11, userId: 21, name: 'Asha Verma', designationLabel: 'Store Manager' },
  { employeeId: 12, userId: 22, name: 'Ravi Kumar', designationLabel: 'Fulfillment & Warehouse' },
];

const HOUR = 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const attendee = (id: number, extra: Partial<Attendee> = {}): Attendee => ({
  id, employeeId: id + 10, userId: id + 20, name: `Person ${id}`, designationLabel: 'Staff', status: 'INVITED', organizer: false,
  invitedAt: iso(-HOUR), declineDeadline: iso(5 * HOUR), declinedAt: null, declineReason: null, replacedByName: null, feedbackSubmittedAt: null,
  ...extra,
});

const meeting = (extra: Partial<Meeting> = {}): Meeting => ({
  id: 7, code: 'MTG-2026-0007', mode: 'ONLINE', title: 'Hotel Pearl pitch', subject: 'Smart locks for 40 rooms', description: null,
  meetingType: 'CLIENT', clientName: 'Hotel Pearl', clientDescription: null, clientContact: 'Mr Rao, 9876543210', outreachBusinessId: null,
  startsAt: iso(48 * HOUR), endsAt: iso(49 * HOUR), joinUrl: 'https://meet.google.com/abc-defg-hij', placeName: null, address: null,
  googleMapsUrl: null, status: 'SCHEDULED', cancelReason: null, organizerId: 99, organizerName: 'Neha Organiser',
  attendees: [attendee(1, { organizer: true, name: 'Neha Organiser', declineDeadline: null }), attendee(2, { name: 'Asha Verma' })],
  feedbackCount: 0, attendeeCount: 2, completedAt: null, createdAt: iso(-HOUR), myAttendance: null, canManage: false, ...extra,
});

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/client-demos" element={<ClientDemosPage />} />
          <Route path="/my-meetings" element={<MyMeetingsPage />} />
          <Route path="/meetings/new" element={<MeetingEditorPage />} />
          <Route path="/meetings/:id/edit" element={<MeetingEditorPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/meetings/:id/feedback" element={<MeetingFeedbackPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue(ok(pageOf<Meeting>([])));
  api.mine.mockResolvedValue(ok(pageOf<Meeting>([])));
  api.invitableStaff.mockResolvedValue(ok(pageOf(STAFF)));
  api.busy.mockResolvedValue(ok<BusySlot[]>([]));
  demos.list.mockResolvedValue(ok([]));
});

// Picks a time on the round clock: the hour ("3 pm"), then the exact minute ("3:00 pm")
const pickTime = async (user: ReturnType<typeof userEvent.setup>, field: HTMLElement, hour: string, minute: string) => {
  await user.click(field);
  const clock = screen.getByRole('dialog', { name: /clock$/ });
  const toggle = within(clock).getByRole('button', { name: hour.slice(-2) });
  if (toggle.getAttribute('aria-pressed') !== 'true') await user.click(toggle);
  await user.click(within(clock).getByRole('button', { name: hour }));
  await user.click(within(clock).getByRole('button', { name: minute }));
};

describe('Meeting form rules', () => {
  const future = addDays(todayIso(), 3);
  const filled = { ...emptyMeetingForm(), title: 'Pitch', joinUrl: 'https://zoom.us/j/1', date: future, startTime: '15:00', endTime: '16:30', attendees: STAFF.slice(0, 1) };

  it('needs a https join link online, and a place and address face-to-face', () => {
    expect(validateMeetingForm(filled, true)).toEqual({});
    expect(validateMeetingForm({ ...filled, joinUrl: 'zoom.us/j/1' }, true).joinUrl).toMatch(/https/);
    const inPerson = validateMeetingForm({ ...filled, mode: 'IN_PERSON', googleMapsUrl: 'https://example.com/x' }, true);
    expect(Object.keys(inPerson).sort()).toEqual(['address', 'googleMapsUrl', 'placeName']);
  });

  it('needs a future start, an end after it within 12 hours, and an invitee when new', () => {
    expect(validateMeetingForm({ ...filled, date: todayIso(), startTime: '00:00', endTime: '00:30' }, true, Date.now()).startTime).toMatch(/future/);
    expect(validateMeetingForm({ ...filled, endTime: '14:00' }, true).endTime).toMatch(/after/);
    expect(validateMeetingForm({ ...filled, startTime: '08:00', endTime: '20:30' }, true).endTime).toMatch(/12 hours/);
    expect(validateMeetingForm({ ...filled, attendees: [] }, true).attendees).toBeTruthy();
    expect(validateMeetingForm({ ...filled, attendees: [] }, false).attendees).toBeUndefined();
  });

  it('sends times with their offset, the other mode’s fields as null, and attendees only when new', () => {
    const body = meetingPayload({ ...filled, placeName: 'Left over' }, true);
    expect(body.startsAt.startsWith(`${future}T15:00:00`)).toBe(true);
    expect(body.startsAt).toMatch(/T15:00:00[+-]\d{2}:\d{2}$/);
    expect(body.endsAt).toMatch(/T16:30:00[+-]\d{2}:\d{2}$/);
    expect(body).toMatchObject({ mode: 'ONLINE', joinUrl: 'https://zoom.us/j/1', placeName: null, address: null, attendeeEmployeeIds: [11] });
    expect(meetingPayload(filled, false)).not.toHaveProperty('attendeeEmployeeIds');
  });
});

describe('Client Demos & Meetings tabs', () => {
  it('opens for DEMO_VIEW or MEETING_VIEW_ALL', () => {
    expect(APP_NAVIGATION.find((item) => item.id === 'client-demos')?.requires).toEqual(['DEMO_VIEW', 'MEETING_VIEW_ALL']);
    expect(APP_NAVIGATION.find((item) => item.id === 'my-meetings')?.requires).toEqual(['MEETING_VIEW_OWN']);
  });

  it('shows only Meetings to someone without demos, and asks for no demo', async () => {
    signIn(['MEETING_VIEW_ALL']);
    renderAt('/client-demos');
    expect(await screen.findByText('No meetings match.')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Schedule meeting/ })).not.toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(demos.list).not.toHaveBeenCalled();
  });

  it('loads the meetings only once their tab is opened', async () => {
    signIn(['DEMO_VIEW', 'MEETING_VIEW_ALL', 'MEETING_SCHEDULE']);
    const user = userEvent.setup();
    renderAt('/client-demos');
    await waitFor(() => expect(demos.list).toHaveBeenCalledTimes(1));
    expect(api.list).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: 'Meetings' }));
    expect(await screen.findByText('No meetings match.')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Schedule meeting/ })).toHaveAttribute('href', '/meetings/new');
  });
});

describe('Scheduling a meeting', () => {
  it('saves an online meeting with its link, time and invitees, and opens it', async () => {
    signIn(ORGANISER);
    api.create.mockResolvedValue(ok(meeting({ id: 31, canManage: true }), 'Scheduled'));
    api.get.mockResolvedValue(ok(meeting({ id: 31, canManage: true })));
    const user = userEvent.setup();
    renderAt('/meetings/new');

    expect(screen.getByText(/meeting ID \(MTG-year-number\) is generated when you save/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Meeting name'), 'Hotel Pearl pitch');
    await user.type(screen.getByLabelText('Join link'), 'https://meet.google.com/abc-defg-hij');
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: addDays(todayIso(), 2) } });
    await pickTime(user, screen.getByRole('button', { name: 'Starts' }), '3 pm', '3:00 pm');
    await pickTime(user, screen.getByRole('button', { name: 'Ends' }), '4 pm', '4:00 pm');
    await user.click(await screen.findByRole('button', { name: 'Invite Ravi Kumar' }));
    await user.click(screen.getByRole('button', { name: 'Schedule meeting' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][0]).toMatchObject({
      mode: 'ONLINE', title: 'Hotel Pearl pitch', joinUrl: 'https://meet.google.com/abc-defg-hij', meetingType: 'CLIENT', attendeeEmployeeIds: [12],
    });
    expect(api.create.mock.calls[0][0].startsAt).toMatch(/T15:00:00[+-]\d{2}:\d{2}$/);
    expect(await screen.findByRole('heading', { name: /Hotel Pearl pitch/ })).toBeInTheDocument();
  });

  it('asks for the place and address face-to-face, and sends nothing until they are given', async () => {
    signIn(ORGANISER);
    const user = userEvent.setup();
    renderAt('/meetings/new');
    await user.click(screen.getByRole('radio', { name: /Face-to-face/ }));
    expect(screen.queryByLabelText('Join link')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Schedule meeting' }));
    expect(screen.getByText('Where is it held?')).toBeInTheDocument();
    expect(screen.getByText('Give the address.')).toBeInTheDocument();
    expect(screen.getByText('Invite at least one person.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('searches the staff to invite on the server only after typing settles', async () => {
    signIn(ORGANISER);
    const user = userEvent.setup();
    renderAt('/meetings/new');
    await screen.findByRole('button', { name: 'Invite Asha Verma' });
    expect(api.invitableStaff).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText('Find staff to invite'), 'ravi');
    expect(api.invitableStaff).toHaveBeenCalledTimes(1);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(api.invitableStaff).toHaveBeenLastCalledWith('ravi', 0));
  });
});

describe('Nobody in two meetings at once', () => {
  const day = addDays(todayIso(), 2);
  const slot = (extra: Partial<BusySlot>): BusySlot => ({
    employeeId: 12, name: 'Ravi Kumar', self: false, meetingId: 3, code: 'MTG-2026-0003',
    startsAt: toOffsetIso(day, '15:30'), endsAt: toOffsetIso(day, '16:30'), ...extra,
  });

  it('greys out on the clock the time I am already in another meeting', async () => {
    signIn(ORGANISER);
    api.busy.mockResolvedValue(ok([slot({ employeeId: 99, name: 'Neha', self: true, startsAt: toOffsetIso(day, '10:00'), endsAt: toOffsetIso(day, '11:00') })]));
    const user = userEvent.setup();
    renderAt('/meetings/new');
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: day } });
    await waitFor(() => expect(api.busy).toHaveBeenLastCalledWith(toOffsetIso(day, '00:00'), toOffsetIso(addDays(day, 1), '00:00'), [], null));

    await user.click(screen.getByRole('button', { name: 'Starts' }));
    const clock = screen.getByRole('dialog', { name: /clock$/ });
    await user.click(within(clock).getByRole('button', { name: 'am' }));
    expect(within(clock).getByRole('button', { name: '10 am' })).toBeDisabled();
    expect(within(clock).getByRole('button', { name: '9 am' })).toBeEnabled();
    expect(within(clock).getByRole('list', { name: 'Already taken this day' })).toHaveTextContent('You · MTG-2026-0003');
  });

  it('warns when an invitee is already in another meeting then, and refuses to schedule it', async () => {
    signIn(ORGANISER);
    api.busy.mockImplementation(async (_from, _to, ids) => ok(ids.includes(12) ? [slot({})] : []));
    const user = userEvent.setup();
    renderAt('/meetings/new');
    await user.type(screen.getByLabelText('Meeting name'), 'Hotel Pearl pitch');
    await user.type(screen.getByLabelText('Join link'), 'https://meet.google.com/abc-defg-hij');
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: day } });
    await pickTime(user, screen.getByRole('button', { name: 'Starts' }), '3 pm', '3:00 pm');
    await pickTime(user, screen.getByRole('button', { name: 'Ends' }), '4 pm', '4:00 pm');
    expect(screen.queryByRole('alert', { name: 'Time clash' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Invite Ravi Kumar' }));
    const warning = await screen.findByRole('alert', { name: 'Time clash' });
    expect(warning).toHaveTextContent('Ravi Kumar is already in MTG-2026-0003');
    await user.click(screen.getByRole('button', { name: 'Schedule meeting' }));
    expect(screen.getByText('Someone is already in another meeting at this time.')).toBeInTheDocument();
    expect(await screen.findByText(/Time clash: someone is already in another meeting/)).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('will not invite someone already in another meeting at the meeting’s time', async () => {
    signIn(ORGANISER);
    const own = meeting({ canManage: true, attendees: [attendee(1, { organizer: true, name: 'Neha Organiser', employeeId: 99 })] });
    api.get.mockResolvedValue(ok(own));
    api.busy.mockResolvedValue(ok([slot({ employeeId: 11, name: 'Asha Verma' })]));
    const user = userEvent.setup();
    renderAt('/meetings/7');

    await user.click(await screen.findByRole('button', { name: /Invite more/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: 'Invite Asha Verma' }));
    await waitFor(() => expect(api.busy).toHaveBeenCalledWith(own.startsAt, own.endsAt, [11], 7));
    expect(await within(dialog).findByRole('alert', { name: 'Time clash' })).toHaveTextContent('Asha Verma is already in MTG-2026-0003');
    await user.click(within(dialog).getByRole('button', { name: 'Send invites' }));
    expect(within(dialog).getByText('Remove whoever is already in another meeting at this time.')).toBeInTheDocument();
    expect(api.addAttendees).not.toHaveBeenCalled();
  });
});

describe('A meeting as an invitee', () => {
  it('can be declined with a reason before the deadline', async () => {
    signIn(SELF);
    const mine = attendee(2, { name: 'Asha Verma' });
    api.get.mockResolvedValue(ok(meeting({ myAttendance: mine })));
    api.decline.mockResolvedValue(ok(meeting({ myAttendance: { ...mine, status: 'DECLINED', declineReason: 'On leave' } })));
    const user = userEvent.setup();
    renderAt('/meetings/7');

    expect(await screen.findByText(/You can decline until/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Join on Google Meet/ })).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    expect(screen.queryByRole('button', { name: 'Cancel meeting' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }));
    expect(api.decline).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText('Reason'), 'On leave');
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(api.decline).toHaveBeenCalledWith(7, 'On leave'));
    expect(await screen.findByText('You declined: On leave')).toBeInTheDocument();
  });

  it('must be attended once the 24-hour window has closed', async () => {
    signIn(SELF);
    api.get.mockResolvedValue(ok(meeting({ myAttendance: attendee(2, { declineDeadline: iso(-HOUR) }) })));
    renderAt('/meetings/7');
    expect(await screen.findByText(/You must attend/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
});

describe('A meeting as its organiser', () => {
  it('invites a replacement for a declined attendee', async () => {
    signIn(ORGANISER);
    const declined = attendee(3, { name: 'Ravi Kumar', employeeId: 12, status: 'DECLINED', declineReason: 'Travelling' });
    const own = meeting({ canManage: true, attendees: [attendee(1, { organizer: true, name: 'Neha Organiser', employeeId: 99 }), declined] });
    api.get.mockResolvedValue(ok(own));
    api.addAttendees.mockResolvedValue(ok(own));
    const user = userEvent.setup();
    renderAt('/meetings/7');

    expect(await screen.findByText('Declined', { exact: false, selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Invite a replacement for Ravi Kumar' }));
    const dialog = screen.getByRole('dialog');
    // Ravi is on the meeting already, so only Asha is offered
    expect(within(dialog).queryByRole('button', { name: 'Invite Ravi Kumar' })).not.toBeInTheDocument();
    await user.click(await within(dialog).findByRole('button', { name: 'Invite Asha Verma' }));
    await user.click(within(dialog).getByRole('button', { name: 'Invite replacement' }));
    await waitFor(() => expect(api.addAttendees).toHaveBeenCalledWith(7, [11], 3));
  });

  it('marks a started meeting completed, then reads all feedback when it is opened', async () => {
    signIn(ORGANISER);
    const started = meeting({ canManage: true, startsAt: iso(-HOUR), endsAt: iso(HOUR) });
    api.get.mockResolvedValue(ok(started));
    api.complete.mockResolvedValue(ok({ ...started, status: 'COMPLETED', feedbackCount: 1 }));
    api.allFeedback.mockResolvedValue(ok([{ attendeeName: 'Asha Verma', agenda: 'Pricing', feedback: 'Keen', decisions: 'Send quote', dealConfirmed: true,
      dealNotes: '40 locks', meetingType: 'CLIENT' as const, rating: 'GOOD' as const, submittedAt: iso(0) }]));
    const user = userEvent.setup();
    renderAt('/meetings/7');

    await user.click(await screen.findByRole('button', { name: 'Mark completed' }));
    await user.click(screen.getAllByRole('button', { name: 'Mark completed' }).at(-1)!);
    await waitFor(() => expect(api.complete).toHaveBeenCalledWith(7));
    expect(api.allFeedback).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: /Feedback · 1 of 2 given/ }));
    expect(await screen.findByRole('article', { name: 'Feedback from Asha Verma' })).toHaveTextContent('Send quote');
  });
});

describe('Meeting feedback', () => {
  const completed = (extra: Partial<Attendee> = {}) => meeting({ status: 'COMPLETED', completedAt: iso(0), myAttendance: attendee(2, extra) });

  it('is given once with every required answer, then shown read-only', async () => {
    signIn(SELF);
    api.get.mockResolvedValue(ok(completed()));
    api.submitFeedback.mockResolvedValue(ok({ agenda: 'Pricing', feedback: 'Keen', decisions: 'Send quote', dealConfirmed: true, dealNotes: null,
      meetingType: 'CLIENT' as const, rating: 'EXCELLENT' as const, submittedAt: iso(0) }));
    const user = userEvent.setup();
    renderAt('/meetings/7/feedback');

    await user.click(await screen.findByRole('button', { name: 'Send feedback' }));
    expect(screen.getByText('What was the agenda?')).toBeInTheDocument();
    expect(screen.getByText('Rate the meeting.')).toBeInTheDocument();
    expect(api.submitFeedback).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Agenda'), 'Pricing');
    await user.type(screen.getByLabelText('Feedback'), 'Keen');
    await user.type(screen.getByLabelText('What was decided'), 'Send quote');
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.click(screen.getByRole('radio', { name: 'Excellent' }));
    await user.click(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => expect(api.submitFeedback).toHaveBeenCalledWith(7, {
      agenda: 'Pricing', feedback: 'Keen', decisions: 'Send quote', dealConfirmed: true, dealNotes: null, meetingType: 'CLIENT', rating: 'EXCELLENT',
    }));
    expect(await screen.findByText('Your feedback is saved and final.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send feedback' })).not.toBeInTheDocument();
    // My earlier feedback is never asked for while the meeting says there is none
    expect(api.myFeedback).not.toHaveBeenCalled();
  });

  it('shows feedback already given, read-only', async () => {
    signIn(SELF);
    api.get.mockResolvedValue(ok(completed({ feedbackSubmittedAt: iso(-HOUR) })));
    api.myFeedback.mockResolvedValue(ok({ agenda: 'Pricing', feedback: 'Keen', decisions: 'Send quote', dealConfirmed: false, dealNotes: null,
      meetingType: 'CLIENT' as const, rating: 'AVERAGE' as const, submittedAt: iso(-HOUR) }));
    renderAt('/meetings/7/feedback');
    expect(await screen.findByText('Average')).toBeInTheDocument();
    expect(api.myFeedback).toHaveBeenCalledWith(7);
    expect(screen.queryByRole('button', { name: 'Send feedback' })).not.toBeInTheDocument();
  });
});

describe('My Meetings', () => {
  it('lists upcoming meetings first, and links a meeting waiting for feedback to its form', async () => {
    signIn(SELF);
    api.mine.mockImplementation(async (status) =>
      ok(pageOf(status === 'COMPLETED' ? [meeting({ id: 8, status: 'COMPLETED', feedbackPending: true, myAttendance: attendee(2) })] : [])));
    const user = userEvent.setup();
    renderAt('/my-meetings');
    expect(await screen.findByText('No meetings coming up.')).toBeInTheDocument();
    expect(api.mine).toHaveBeenLastCalledWith('SCHEDULED', 0);
    await user.click(screen.getByRole('button', { name: 'Past' }));
    expect(await screen.findByRole('link', { name: 'Open MTG-2026-0007' })).toHaveAttribute('href', '/meetings/8/feedback');
  });

  it('badge: shows the count from the unread-count call to those with My Meetings, and drops one per feedback', async () => {
    setPendingFeedbackCount(3);
    signIn(['DEMO_VIEW']);
    const without = renderHook(() => usePendingFeedbackCount(true));
    expect(without.result.current).toBe(0);
    without.unmount();

    signIn(SELF);
    const { result } = renderHook(() => usePendingFeedbackCount(true));
    expect(result.current).toBe(3);
    act(() => decrementPendingFeedbackCount());
    expect(result.current).toBe(2);
    act(() => setPendingFeedbackCount(0));
  });
});

describe('Meetings: endpoint permissions', () => {
  it('lists the permission of every meeting endpoint that has a fixed one', () => {
    const required = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
    expect(required('GET', '/v1/meetings?status=SCHEDULED&page=0')).toBe('MEETING_VIEW_ALL');
    expect(required('GET', '/v1/meetings/mine')).toBe('MEETING_VIEW_OWN');
    expect(required('GET', '/v1/meetings/invitable-staff?search=ravi')).toBe('MEETING_SCHEDULE');
    expect(required('GET', '/v1/meetings/busy?from=x&to=y')).toBe('MEETING_SCHEDULE');
    expect(required('POST', '/v1/meetings')).toBe('MEETING_SCHEDULE');
    expect(required('PUT', '/v1/meetings/7')).toBe('MEETING_SCHEDULE');
    expect(required('POST', '/v1/meetings/7/attendees')).toBe('MEETING_SCHEDULE');
    expect(required('POST', '/v1/meetings/7/cancel')).toBe('MEETING_SCHEDULE');
    expect(required('POST', '/v1/meetings/7/complete')).toBe('MEETING_SCHEDULE');
    expect(required('POST', '/v1/meetings/7/decline')).toBe('MEETING_RESPOND_OWN');
    expect(required('GET', '/v1/meetings/7/feedback/mine')).toBe('MEETING_RESPOND_OWN');
    expect(required('POST', '/v1/meetings/7/feedback')).toBe('MEETING_RESPOND_OWN');
    // Either of two permissions: the server decides
    expect(required('GET', '/v1/meetings/7')).toBeNull();
    expect(required('GET', '/v1/meetings/7/feedback')).toBeNull();
  });
});
