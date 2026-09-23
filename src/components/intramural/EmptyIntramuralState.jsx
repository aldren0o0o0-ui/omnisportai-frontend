import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import EmptyState from '../common/EmptyState';

// Role-aware "no active intramural" screen. Every role gets meaningful guidance
// instead of a blank page or empty tables. Coordinators get creation/history
// CTAs; other roles get a role-appropriate waiting message (they can't create
// or activate intramurals, so no action button is shown for them).
const ROLE_COPY = {
  coordinator: {
    title: 'Create an intramural',
    message: 'Set the event name, dates, sports, and departments to begin preparing the competition.',
  },
  department: {
    title: 'Waiting for the next Intramural',
    message: 'Your department view appears when an intramural is active.',
  },
  coach: {
    title: 'No active Intramural assigned yet',
    message: 'Your teams and matches appear when an intramural is active.',
  },
  'sport-facilitator': {
    title: 'No active Intramural available',
    message: 'Your sports and schedules appear when an intramural is active.',
  },
  viewer: {
    title: 'No Intramural is currently active',
    message: 'Standings and results appear when an intramural starts.',
  },
};

const EmptyIntramuralState = ({ role = 'viewer' }) => {
  const navigate = useNavigate();
  const copy = ROLE_COPY[role] || ROLE_COPY.viewer;
  const isCoordinator = role === 'coordinator';

  return (
    <EmptyState
      icon={Trophy}
      title={copy.title}
      message={copy.message}
      action={
        isCoordinator ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/coordinator/intramurals/create')}
              className="os-btn-primary-soft"
            >
              Create Intramural
            </button>
            <button
              type="button"
              onClick={() => navigate('/coordinator/intramurals')}
              className="os-btn-ghost-soft"
            >
              View History
            </button>
          </div>
        ) : null
      }
    />
  );
};

export default EmptyIntramuralState;
