import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Clock3,
  Cpu,
  GitBranch,
  Layers3,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './LandingPage.css';

const featureCards = [
  {
    icon: Layers3,
    title: 'Conflict-aware scheduling',
    description:
      'Builds match calendars around venue limits, rest windows, and shared player availability without manual reshuffling.',
  },
  {
    icon: GitBranch,
    title: 'Adaptive bracket control',
    description:
      'Keeps elimination paths, standings, and progression rules synchronized as results come in from multiple sports.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-safe operations',
    description:
      'Separates coordinator, facilitator, coach, and viewer permissions so the right people can act without exposing everything.',
  },
  {
    icon: Clock3,
    title: 'Live operational visibility',
    description:
      'Surfaces bottlenecks, overlaps, and underused venues before they become same-day schedule problems.',
  },
  {
    icon: BarChart3,
    title: 'Clean tournament analytics',
    description:
      'Turns participation, fairness, and performance signals into readable dashboards for quick event decisions.',
  },
  {
    icon: Trophy,
    title: 'Multi-sport continuity',
    description:
      'Connects registration, scheduling, scoring, and standings into one system so every event feels coordinated.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Collect',
    description: 'Capture teams, venues, staff, and player commitments in one place.',
  },
  {
    step: '02',
    title: 'Resolve',
    description: 'Let the engine remove clashes and balance schedules automatically.',
  },
  {
    step: '03',
    title: 'Run',
    description: 'Monitor match-day execution with bracket, venue, and staffing context.',
  },
  {
    step: '04',
    title: 'Improve',
    description: 'Review operational insights to tighten the next tournament cycle.',
  },
];

const roleCards = [
  {
    title: 'Coordinators',
    description: 'Steer tournament logic, approvals, venues, and exception handling from a single command layer.',
  },
  {
    title: 'Facilitators',
    description: 'Manage sport-day delivery with clearer assignments, live updates, and less manual follow-up.',
  },
  {
    title: 'Coaches and Viewers',
    description: 'Track schedules, brackets, and standings through a simpler interface that stays readable on mobile.',
  },
];

const heroHighlights = [
  'Conflict-free venue planning',
  'Faster bracket updates',
  'Readable on phones, tablets, and desktops',
];

const heroStats = [
  { label: 'Shared schedule visibility', value: '24/7' },
  { label: 'Planning layers unified', value: '6+' },
  { label: 'Key operations screens', value: '1 hub' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="landing-shell relative min-h-screen overflow-x-clip bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-300">
      <div className="landing-orb landing-orb-primary" />
      <div className="landing-orb landing-orb-secondary" />
      <div className="landing-grid-overlay" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--landing-border)] bg-[color-mix(in_srgb,var(--landing-surface)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left"
            aria-label="Go to OmniSport AI home"
          >
            <span className="landing-brand-mark">
              <Cpu size={22} />
            </span>
            <span>
              <span className="landing-eyebrow">OmniSport AI</span>
              <span className="landing-brand-title">Intramural command center</span>
            </span>
          </button>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="landing-nav-link">
              Features
            </a>
            <a href="#workflow" className="landing-nav-link">
              Workflow
            </a>
            <a href="#roles" className="landing-nav-link">
              Roles
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-pressed={isDark}
              className="landing-icon-button"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="landing-primary-button px-4 py-3 text-sm sm:px-5"
            >
              <span className="hidden sm:inline">Open Admin Portal</span>
              <span className="sm:hidden">Portal</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-14">
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="max-w-3xl"
            >
              <motion.div variants={fadeUp} className="landing-pill mb-5">
                <Sparkles size={14} />
                AI-assisted tournament operations
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="landing-display max-w-4xl text-4xl leading-none sm:text-5xl lg:text-7xl"
              >
                Better intramurals start with calmer scheduling.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-2xl text-base leading-8 text-[var(--landing-muted)] sm:text-lg"
              >
                OmniSport AI brings scheduling, brackets, staffing, and standings into one
                responsive workspace so your events feel organized before the first match
                starts.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--landing-soft)]"
              >
                {heroHighlights.map((highlight) => (
                  <span key={highlight} className="landing-chip">
                    {highlight}
                  </span>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="landing-primary-button justify-center px-6 py-4"
                >
                  Launch the system
                  <ArrowRight size={18} />
                </button>
                <a
                  href="#features"
                  className="landing-secondary-button px-6 py-4 text-center"
                >
                  Explore the experience
                </a>
              </motion.div>

              <motion.div
                variants={stagger}
                className="mt-10 grid gap-3 sm:grid-cols-3"
              >
                {heroStats.map((stat) => (
                  <motion.div key={stat.label} variants={fadeUp} className="landing-stat-card">
                    <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-[var(--landing-muted)]">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="w-full"
            >
              <motion.div variants={fadeUp} className="landing-preview-shell">
                <div className="landing-preview-top">
                  <div>
                    <p className="landing-section-label">Operations pulse</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      Cleaner coordination across venues, staff, and brackets.
                    </h2>
                  </div>
                  <span className="landing-status-badge">System ready</span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="landing-preview-card">
                    <div className="flex items-center justify-between">
                      <span className="landing-preview-title">Schedule health</span>
                      <CalendarRange size={18} className="text-[var(--landing-accent)]" />
                    </div>
                    <div className="mt-5 space-y-4">
                      <ProgressRow label="Venue utilization" value="92%" width="92%" tone="accent" />
                      <ProgressRow label="Conflict clearance" value="100%" width="100%" tone="secondary" />
                      <ProgressRow label="Rest-window coverage" value="88%" width="88%" tone="accent" />
                    </div>
                  </div>

                  <div className="landing-preview-card">
                    <span className="landing-preview-title">Today&apos;s flow</span>
                    <div className="mt-5 space-y-3">
                      <TimelineRow time="08:00" title="Venue check-in opens" subtitle="Staff and officials assigned" />
                      <TimelineRow time="10:30" title="Bracket sync refresh" subtitle="Quarterfinal seeding validated" />
                      <TimelineRow time="14:00" title="Standings update window" subtitle="Live results reflected across roles" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                  <div className="landing-preview-card">
                    <span className="landing-preview-title">What teams experience</span>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <MiniMetric label="Sports tracked" value="12" />
                      <MiniMetric label="Venues linked" value="18" />
                      <MiniMetric label="Bracket states" value="Live" />
                    </div>
                  </div>

                  <div className="landing-preview-card">
                    <span className="landing-preview-title">Access lanes</span>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="landing-chip">Coordinator</span>
                      <span className="landing-chip">Facilitator</span>
                      <span className="landing-chip">Coach</span>
                      <span className="landing-chip">Viewer</span>
                    </div>
                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--landing-accent-soft)] px-4 py-3 text-sm text-[var(--landing-text)]">
                      <Users size={18} />
                      Shared visibility with role-based control.
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="mx-auto max-w-7xl"
          >
            <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="landing-section-label">Feature set</p>
              <h2 className="mt-3 landing-section-title">
                A landing page that finally matches the product behind it.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--landing-muted)] sm:text-lg">
                The experience now uses balanced color contrast, cleaner card rhythm, and a
                layout that scales down without losing hierarchy.
              </p>
            </motion.div>

            <motion.div
              variants={stagger}
              className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {featureCards.map(({ icon: Icon, title, description }) => (
                <motion.article key={title} variants={fadeUp} className="landing-feature-card">
                  <div className="landing-feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--landing-muted)]">
                    {description}
                  </p>
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section id="workflow" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="mx-auto max-w-7xl rounded-[2rem] border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 shadow-[var(--landing-shadow)] sm:p-8 lg:p-10"
          >
            <motion.div variants={fadeUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="landing-section-label">Workflow</p>
                <h2 className="mt-3 landing-section-title text-left">
                  Clear sequence, stronger alignment, less visual clutter.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[var(--landing-muted)] sm:text-base">
                Each step now has a consistent card structure and spacing so the story stays
                easy to scan on narrow screens and wide displays alike.
              </p>
            </motion.div>

            <motion.div
              variants={stagger}
              className="mt-8 grid gap-4 lg:grid-cols-4"
            >
              {workflowSteps.map(({ step, title, description }) => (
                <motion.div key={step} variants={fadeUp} className="landing-workflow-card">
                  <span className="landing-step-number">{step}</span>
                  <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--landing-muted)]">
                    {description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section id="roles" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <motion.div variants={fadeUp} className="max-w-2xl">
              <p className="landing-section-label">Built for teams</p>
              <h2 className="mt-3 landing-section-title text-left">
                Responsive by default across every role.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--landing-muted)] sm:text-lg">
                The new composition uses tighter vertical rhythm on phones, balanced content
                widths on tablets, and a true two-column hero on larger screens.
              </p>
            </motion.div>

            <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-3">
              {roleCards.map(({ title, description }) => (
                <motion.article key={title} variants={fadeUp} className="landing-role-card">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--landing-muted)]">
                    {description}
                  </p>
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] border border-[var(--landing-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--landing-surface)_85%,transparent),color-mix(in_srgb,var(--landing-accent-soft)_90%,transparent))] p-6 shadow-[var(--landing-shadow)] sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10"
          >
            <div className="max-w-2xl">
              <p className="landing-section-label">Ready to enter</p>
              <h2 className="mt-3 landing-section-title text-left">
                Move from scattered tournament admin to one readable workflow.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="landing-primary-button w-full justify-center px-6 py-4 sm:w-auto"
            >
              Continue to login
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--landing-border)] px-4 py-8 text-center text-sm text-[var(--landing-soft)] sm:px-6 lg:px-8">
        <p>OmniSport AI (c) 2026. Designed for smoother tournament operations.</p>
      </footer>
    </div>
  );
};

const MiniMetric = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface-muted)] px-4 py-4">
    <div className="text-xl font-semibold tracking-tight">{value}</div>
    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--landing-soft)]">
      {label}
    </div>
  </div>
);

const TimelineRow = ({ time, title, subtitle }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface-muted)] px-4 py-3">
    <span className="landing-time-pill">{time}</span>
    <div className="min-w-0">
      <div className="text-sm font-semibold text-[var(--landing-text)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--landing-muted)]">{subtitle}</div>
    </div>
  </div>
);

const ProgressRow = ({ label, value, width, tone }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
      <span className="text-[var(--landing-muted)]">{label}</span>
      <span className="font-semibold text-[var(--landing-text)]">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[var(--landing-track)]">
      <div
        className={`h-full rounded-full ${tone === 'secondary' ? 'bg-[var(--landing-secondary)]' : 'bg-[var(--landing-accent)]'}`}
        style={{ width }}
      />
    </div>
  </div>
);

export default LandingPage;
