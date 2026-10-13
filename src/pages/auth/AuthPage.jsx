import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
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

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isRegisterRoute = location.pathname.includes('register');
  const [isLogin, setIsLogin] = useState(!isRegisterRoute);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: '',
    invite_code: '',
  });

  useEffect(() => {
    setIsLogin(!location.pathname.includes('register'));
  }, [location.pathname]);

  useEffect(() => {
    const loadDepartments = async () => {
      setDeptLoading(true);
      try {
        const data = await getDepartments();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        setDepartments([]);
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
          setFeedback({ type: 'error', message: 'Department selection is required.' });
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
          message: 'Account successfully registered. You can sign in now.',
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
        message: error.response?.data?.detail || 'Authentication failed. Please verify your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell flex flex-col justify-between">
      {/* Top Header - Uniform with AppTopHeader */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left focus:outline-none"
            aria-label="Back to home"
          >
            <div className="auth-brand-mark">
              OA
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[var(--text-main)] sm:text-base">
                OmniSport AI
              </span>
              <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                Intramural Access Portal
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="auth-secondary-button"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back to Overview</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="auth-icon-button"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="auth-panel">
          <div className="auth-panel-inner">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="auth-brand-mark mb-3 h-10 w-10 text-base">
                OA
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)] sm:text-2xl">
                {isLogin ? 'Sign in to OmniSport AI' : 'Create an account'}
              </h1>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {isLogin
                  ? 'Access your tournament coordinator, coach, or official dashboard'
                  : 'Register your profile under your university department'}
              </p>
            </div>

            {/* Segmented Mode Switch */}
            <div className="auth-mode-toggle mb-5" role="tablist">
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
                Create account
              </button>
            </div>

            {/* Feedback Alert */}
            {feedback.message && (
              <div
                className={`auth-feedback mb-4 ${feedback.type === 'error' ? 'is-error' : 'is-success'}`}
                role="status"
              >
                {feedback.message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="auth-field-label">Full Name</label>
                  <div className="auth-input-shell">
                    <div className="auth-input-icon">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      placeholder="e.g. Alex Morgan"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="auth-field-label">Email Address</label>
                <div className="auth-input-shell">
                  <div className="auth-input-icon">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    placeholder="user@university.edu"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="auth-field-label">Password</label>
                <PasswordInput
                  value={formData.password}
                  onChange={(val) => setFormData({ ...formData, password: val })}
                  placeholder="Enter your password"
                />
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <label className="auth-field-label">University Department</label>
                    <div className="auth-input-shell">
                      <div className="auth-input-icon">
                        <Users size={16} />
                      </div>
                      <select
                        required
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="auth-select"
                        disabled={deptLoading}
                      >
                        <option value="">
                          {deptLoading ? 'Loading departments...' : 'Select your department'}
                        </option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.department_name} ({dept.department_code})
                          </option>
                        ))}
                      </select>
                      <div className="auth-select-arrow">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                    <p className="auth-helper-text">
                      Connect your account to the department you represent.
                    </p>
                  </div>

                  {requiresInvite && (
                    <div className="space-y-1.5">
                      <label className="auth-field-label">Sports Office Invite Code</label>
                      <div className="auth-input-shell">
                        <div className="auth-input-icon">
                          <KeyRound size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.invite_code}
                          placeholder="Enter authorization invite code"
                          onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                          className="auth-input"
                        />
                      </div>
                      <p className="auth-helper-text">
                        Sports Office registrations require an administrator-issued code.
                      </p>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="auth-primary-button mt-2 w-full"
              >
                <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-5 border-t border-[var(--border-soft)] pt-4 text-center">
              <p className="text-xs text-[var(--text-muted)]">
                {isLogin ? "Don't have an account yet?" : 'Already registered with a department?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(!isLogin)}
                  className="font-semibold text-[var(--primary)] hover:underline"
                >
                  {isLogin ? 'Register here' : 'Sign in here'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Uniform Footer */}
      <footer className="border-t border-[var(--border-soft)] bg-[var(--surface)] px-4 py-4 text-center text-xs text-[var(--text-muted)]">
        OmniSport AI · Secure Role-Based Authentication
      </footer>
    </div>
  );
};

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="auth-input-shell">
      <div className="auth-input-icon">
        <Lock size={16} />
      </div>
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="auth-input pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="auth-password-toggle"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export default AuthPage;
