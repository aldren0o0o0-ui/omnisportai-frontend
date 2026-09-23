import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Sparkles,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getDepartments } from '../../services/departmentService';
import './AuthPage.css';

const resolveDefaultRoleRoute = ({ roleNames = [], isViewerOnly = false } = {}) => {
  if (roleNames.includes('SPORTS_COORDINATOR')) return '/coordinator/dashboard';
  if (roleNames.includes('DEPARTMENT_MANAGER')) return '/department/dashboard';
  if (roleNames.includes('SPORTS_FACILITATOR')) return '/sport-facilitator/dashboard';
  if (roleNames.includes('COACH')) return '/coach/dashboard';
  if (isViewerOnly) return '/viewer/dashboard';
  return '/viewer/dashboard';
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const MotionSection = motion.section;
const MotionDiv = motion.div;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: '',
    invite_code: '',
  });

  useEffect(() => {
    const loadDepartments = async () => {
      setDeptLoading(true);
      try {
        const data = await getDepartments();
        setDepartments(data);
      } finally {
        setDeptLoading(false);
      }
    };

    if (!isLogin) {
      loadDepartments();
    }
  }, [isLogin]);

  const selectedDepartment = useMemo(() => {
    const id = Number(formData.department_id);
    if (!id) return null;
    return departments.find((dept) => dept.id === id) || null;
  }, [departments, formData.department_id]);

  const requiresInvite = selectedDepartment?.department_code === 'SPORTS';

  const switchMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setFeedback({ type: '', message: '' });
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      if (isLogin) {
        const profile = await login({
          email: formData.email,
          password: formData.password,
        });

        const roleNames = profile?.roles?.map((role) => role.role_name) || [];
        const pendingRedirect = window.sessionStorage.getItem('omnisport_post_login_redirect');

        if (pendingRedirect && pendingRedirect.startsWith('/')) {
          window.sessionStorage.removeItem('omnisport_post_login_redirect');
          navigate(pendingRedirect);
        } else {
          navigate(
            resolveDefaultRoleRoute({
              roleNames,
              isViewerOnly: Boolean(profile?.isViewerOnly),
            })
          );
        }
      } else {
        const departmentId = Number(formData.department_id);

        if (!departmentId || Number.isNaN(departmentId)) {
          setFeedback({ type: 'error', message: 'Department is required.' });
          return;
        }

        if (requiresInvite && !formData.invite_code.trim()) {
          setFeedback({
            type: 'error',
            message: 'Invite code is required for Sports Office registrations.',
          });
          return;
        }

        await authApi.register({
          ...formData,
          department_id: departmentId,
          invite_code: formData.invite_code?.trim() || undefined,
        });

        setFeedback({
          type: 'success',
          message: 'Account created. You can sign in now.',
        });
        setIsLogin(true);
        setFormData({
          name: '',
          email: '',
          password: '',
          department_id: '',
          invite_code: '',
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Authentication failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden bg-[var(--auth-bg)] text-[var(--auth-text)]">
      <div className="auth-orb auth-orb-primary" />
      <div className="auth-orb auth-orb-secondary" />
      <div className="auth-grid-overlay" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--auth-border)] bg-[color-mix(in_srgb,var(--auth-surface)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-3 sm:px-6 sm:py-4 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-w-0 items-center gap-2.5 sm:gap-3 text-left focus:outline-none"
            aria-label="Go to OmniSport AI home"
          >
            <span className="auth-brand-mark flex-shrink-0">
              <Activity size={20} className="sm:h-[22px] sm:w-[22px]" />
            </span>
            <span className="min-w-0">
              <span className="auth-eyebrow block">OmniSport AI</span>
              <span className="auth-brand-title truncate">Tournament access</span>
            </span>
          </button>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="auth-secondary-button"
              aria-label="Back to home"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to home</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-pressed={isDark}
              className="auth-icon-button"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </nav>
      <main className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 pt-20 pb-8 sm:px-6 sm:pt-24 sm:pb-12 lg:px-8">
        <div className="flex w-full justify-center">
          <MotionSection
            initial="hidden"
            animate="show"
            variants={stagger}
            className="auth-panel"
          >
            <MotionDiv variants={fadeUp} className="auth-panel-inner">
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="flex items-center gap-3">
                  <div className="auth-panel-mark">
                    <Activity size={22} className="sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--auth-text)] sm:text-2xl">
                      {isLogin ? 'Welcome back' : 'Create your account'}
                    </h2>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[var(--auth-muted)] sm:text-sm sm:leading-6">
                  {isLogin
                    ? 'Sign in to continue to your role-based dashboard.'
                    : 'Register your account and connect it to the right department.'}
                </p>

                <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
                  <button
                    type="button"
                    className={isLogin ? 'active' : ''}
                    onClick={() => switchMode(true)}
                    aria-selected={isLogin}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={!isLogin ? 'active' : ''}
                    onClick={() => switchMode(false)}
                    aria-selected={!isLogin}
                  >
                    Sign up
                  </button>
                </div>

                {feedback.message ? (
                  <div
                    className={`auth-feedback ${feedback.type === 'error' ? 'is-error' : 'is-success'}`}
                    role="status"
                  >
                    {feedback.message}
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleAuth} className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">
                {!isLogin ? (
                  <AuthInput
                    label="Name"
                    value={formData.name}
                    icon={<User size={18} />}
                    placeholder="Your full name"
                    onChange={(value) => setFormData({ ...formData, name: value })}
                  />
                ) : null}

                <AuthInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  icon={<Mail size={18} />}
                  placeholder="coach@omnisport.ai"
                  onChange={(value) => setFormData({ ...formData, email: value })}
                />

                <AuthInput
                  label="Password"
                  type="password"
                  value={formData.password}
                  icon={<Lock size={18} />}
                  placeholder="Enter your password"
                  onChange={(value) => setFormData({ ...formData, password: value })}
                />

                {!isLogin ? (
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="auth-field-label">Department</label>
                      <div className="auth-input-shell">
                        <div className="auth-input-icon">
                          <Users size={18} />
                        </div>
                        <select
                          value={formData.department_id}
                          onChange={(event) =>
                            setFormData({ ...formData, department_id: event.target.value })
                          }
                          className="auth-select"
                          disabled={deptLoading}
                        >
                          <option value="">
                            {deptLoading ? 'Loading departments...' : 'Select department'}
                          </option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.department_name}
                            </option>
                          ))}
                        </select>
                        <div className="auth-select-arrow" aria-hidden="true">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                      <p className="auth-helper-text">
                        Pick the department your role belongs to before you continue.
                      </p>
                    </div>

                    {requiresInvite ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        <AuthInput
                          label="Sports Office Invite Code"
                          type="text"
                          value={formData.invite_code}
                          icon={<KeyRound size={18} />}
                          placeholder="Enter invite code"
                          onChange={(value) =>
                            setFormData({ ...formData, invite_code: value })
                          }
                        />
                        <p className="auth-helper-text">
                          Sports Office registrations require an approved invite code.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-primary-button w-full"
                >
                  <span>{loading ? 'Processing...' : isLogin ? 'Continue to dashboard' : 'Create account'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-[var(--auth-muted)] sm:mt-6 sm:text-sm">
                {isLogin ? 'Need an account?' : 'Already registered?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(!isLogin)}
                  className="font-semibold text-[var(--auth-accent)] transition-opacity hover:opacity-80 underline-offset-4 hover:underline"
                >
                  {isLogin ? 'Create one here' : 'Sign in here'}
                </button>
              </p>
            </MotionDiv>
          </MotionSection>
        </div>
      </main>
    </div>
  );
};

const AuthInput = ({ label, type = 'text', icon, placeholder, onChange, value }) => (
  <AuthInputInner
    label={label}
    type={type}
    icon={icon}
    placeholder={placeholder}
    onChange={onChange}
    value={value}
  />
);

const AuthInputInner = ({ label, type = 'text', icon, placeholder, onChange, value }) => {
  const [isVisible, setIsVisible] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && isVisible ? 'text' : type;

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="auth-field-label">{label}</label>
      <div className="auth-input-shell">
        <div className="auth-input-icon">{icon}</div>
        <input
          type={inputType}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`auth-input ${isPasswordField ? 'pr-10 sm:pr-12' : ''}`}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            className="auth-password-toggle"
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default AuthPage;
