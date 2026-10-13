import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Moon,
  Shield,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './LandingPage.css';

const platformFeatures = [
  {
    icon: Calendar,
    title: 'Conflict-Aware Scheduling',
    description:
      'Generates match calendars respecting court capacity, rest windows, venue limits, and official availability without scheduling overlaps.',
  },
  {
    icon: Trophy,
    title: 'Dynamic Bracket Progression',
    description:
      'Supports single elimination, double elimination, and round-robin structures with automated winner advancement and bye handling.',
  },
  {
    icon: Activity,
    title: 'Real-Time Tally Boards',
    description:
      'Synchronized court-side live scoring, period clocks, possession trackers, and direct shortcut winner finalization across every sport.',
  },
  {
    icon: Layers,
    title: 'Multi-Sport Governance',
    description:
      'Configured rule models for Basketball, Volleyball, Football, Badminton, Sepak Takraw, and Boxing with official scoring policies.',
  },
  {
    icon: Users,
    title: 'Department & Roster Management',
    description:
      'Manage student-athlete rosters, medical clearances, jersey numbers, and team registrations across all collegiate departments.',
  },
  {
    icon: Shield,
    title: 'Role-Safe Access Control',
    description:
      'Granular permissions for Sports Coordinators, Department Managers, Facilitators, Coaches, and public campus Viewers.',
  },
];

const roleWorkflows = [
  {
    role: 'Sports Coordinator',
    tag: 'Full Administration',
    description:
      'Oversees the entire intramural lifecycle: create tournament structures, generate brackets, assign venues, resolve conflicts, and certify official standings.',
    highlights: ['Tournament Setup Wizard', 'Conflict-Free Scheduler', 'Official Match Certification'],
  },
  {
    role: 'Sports Facilitator / Official',
    tag: 'Match Operations',
    description:
      'Operates courtside scoring during games: real-time period clocks, score actions, player fouls, timeouts, and shortcut winner finalization.',
    highlights: ['Live Tally Boards', 'Synchronized Game Clocks', 'Possession & Violation Tracking'],
  },
  {
    role: 'Department Manager & Coach',
    tag: 'Team Management',
    description:
      'Submits and manages department rosters, monitors upcoming schedules, reviews player availability, and tracks pool standings.',
    highlights: ['Team Lineup Submissions', 'Player Eligibility Tracking', 'Department Match Calendar'],
  },
  {
    role: 'Student Athlete & Viewer',
    tag: 'Campus Community',
    description:
      'Follows university tournament action live: check upcoming match dates, view live scores, inspect tournament brackets, and view leaderboard rankings.',
    highlights: ['Real-Time Live Scores', 'Interactive Tournament Brackets', 'Public Division Standings'],
  },
];

const metricStats = [
  { label: 'Supported Sports', value: '6+ Canonical Sports' },
  { label: 'Schedule Engine', value: '100% Conflict-Aware' },
  { label: 'Live Scoring Sync', value: 'Real-Time WebSockets' },
  { label: 'Role Governance', value: '5 Distinct Roles' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="landing-shell flex flex-col">
      {/* Top Navigation Bar - Uniform with AppTopHeader */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="landing-brand-mark">
              OA
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[var(--text-main)] sm:text-base">
                OmniSport AI
              </span>
              <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                Intramural & Tournament Command Center
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="landing-nav-link">
              Capabilities
            </a>
            <a href="#showcase" className="landing-nav-link">
              Live Operations
            </a>
            <a href="#roles" className="landing-nav-link">
              Roles & Access
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="landing-icon-button"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="landing-secondary-button hidden sm:inline-flex"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="landing-primary-button"
            >
              <span>Open Portal</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center">
              <span className="landing-pill">
                <Trophy size={14} />
                Intramural & Athletic Tournament Platform
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl">
              Tournament operations and match scheduling, unified.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              Designed for athletic coordinators, department managers, sports officials, coaches, and student-athletes.
              Generate conflict-free schedules, manage dynamic brackets, and operate courtside tally boards in real time.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="landing-primary-button px-6 py-3 text-sm sm:text-base"
              >
                <span>Access Management Portal</span>
                <ArrowRight size={17} />
              </button>
              <a
                href="#showcase"
                className="landing-secondary-button px-6 py-3 text-sm sm:text-base"
              >
                <span>View Live Dashboard Preview</span>
              </a>
            </div>

            {/* Metrics Bar */}
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {metricStats.map((stat) => (
                <div
                  key={stat.label}
                  className="landing-card p-4 text-center sm:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-base font-bold text-[var(--text-main)] sm:text-lg">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Simulation / Showcase */}
        <section id="showcase" className="border-y border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                  Live Operations Center
                </span>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
                  Unified visibility across every court and fixture
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="landing-badge landing-badge-live">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live Scoring Active
                </span>
                <span className="landing-badge landing-badge-success">
                  All Courts Synced
                </span>
              </div>
            </div>

            {/* Simulated Clean Dashboard Surface */}
            <div className="landing-card overflow-hidden">
              {/* Dashboard Subheader */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-[var(--text-main)] sm:text-sm">
                    University Intramural Championship 2026
                  </span>
                  <span className="hidden rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] sm:inline">
                    Main Gymnasium & Field Complex
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Real-time sync</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Match Cards Grid */}
              <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
                {/* Match 1: Basketball */}
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Basketball · Men's Semifinal
                    </span>
                    <span className="landing-badge landing-badge-live">
                      Q4 01:24
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        Titans (CCIS)
                      </span>
                      <span className="text-lg font-extrabold text-[var(--text-main)]">84</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-muted)]">
                        Phoenix (CBA)
                      </span>
                      <span className="text-lg font-extrabold text-[var(--text-muted)]">79</span>
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                    <span>Court 1 · Main Arena</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Titans +5</span>
                  </div>
                </div>

                {/* Match 2: Volleyball */}
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Volleyball · Women's Final
                    </span>
                    <span className="landing-badge landing-badge-live">
                      Set 4 (21-18)
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        Warriors (CEA)
                      </span>
                      <span className="text-lg font-extrabold text-[var(--text-main)]">2 Sets</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-muted)]">
                        Falcons (CAS)
                      </span>
                      <span className="text-lg font-extrabold text-[var(--text-muted)]">1 Set</span>
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                    <span>Court 2 · Volleyball Hall</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Match Point Set</span>
                  </div>
                </div>

                {/* Match 3: Badminton */}
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Badminton · Singles Quarterfinal
                    </span>
                    <span className="landing-badge landing-badge-neutral">
                      Final
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        J. Santos (CED)
                      </span>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">21, 21</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-muted)]">
                        M. Reyes (CON)
                      </span>
                      <span className="text-lg font-extrabold text-[var(--text-muted)]">17, 19</span>
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                    <span>Court 3 · Badminton Center</span>
                    <span className="font-semibold text-[var(--text-main)]">Advanced to Semis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Platform Capabilities */}
        <section id="features" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                Core Capabilities
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
                Built specifically for collegiate athletic operations
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--text-muted)] sm:text-base">
                Everything required to run multi-sport leagues and tournaments cleanly without spreadsheets or fragmented tools.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="landing-card p-6">
                    <div className="landing-feature-icon">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[var(--text-main)]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Roles & Governance */}
        <section id="roles" className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                Role Governance
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
                Tailored workflows for every tournament stakeholder
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--text-muted)] sm:text-base">
                Each participant logs into a dedicated view focused entirely on what they need to execute.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {roleWorkflows.map((item) => (
                <div key={item.role} className="landing-card p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[var(--text-main)]">
                      {item.role}
                    </h3>
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                      {item.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                    {item.description}
                  </p>
                  <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Key Highlights:
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Simple Call to Action Card */}
        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="landing-card bg-[var(--surface)] p-8 text-center sm:p-12">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
                Ready to coordinate your sports tournaments?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--text-muted)] sm:text-base">
                Sign in with your university account or register under your department to access tournament schedules, live scoring, and team rosters.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="landing-primary-button px-6 py-3"
                >
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Uniform Minimal Footer */}
      <footer className="border-t border-[var(--border-soft)] bg-[var(--surface)] px-4 py-6 text-xs text-[var(--text-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="landing-brand-mark h-6 w-6 text-xs">
              OA
            </div>
            <span className="font-semibold text-[var(--text-main)]">
              OmniSport AI
            </span>
            <span>· Athletic Tournament & Intramural System</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-[var(--text-main)] transition"
            >
              Sign In
            </button>
            <span>·</span>
            <span>All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
