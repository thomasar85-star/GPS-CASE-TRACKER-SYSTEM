import React, { useEffect, useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  Building2,
  Award,
  AlertCircle,
  X,
  Info,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Officer, OfficerRole } from '../types';
import { storage } from '../services/storage';
import { supabaseSync } from '../services/supabaseSync';
import {
  ensureSupabaseInitialized,
  isSupabaseConfigured,
  signInWithEmailSupabase,
  signUpWithEmailSupabase,
} from '../lib/supabase';
import {
  getPlaceholderImage,
  GPS_RANKS_BY_ROLE,
} from '../utils/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (officer: Officer) => void;
  isFullPage?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isFullPage = false,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured);
  const stations = storage.getStations();

  useEffect(() => {
    ensureSupabaseInitialized().then(ready => {
      setSupabaseReady(ready || isSupabaseConfigured);
    });
  }, []);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign-up form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [role, setRole] = useState<OfficerRole>('investigator');
  const [stationId, setStationId] = useState(stations[0]?.id || 'stn_accra_central');

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !loginPassword) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const ready = await ensureSupabaseInitialized();
    setSupabaseReady(ready);
    if (!ready) {
      setLoading(false);
      setErrorMsg(
        'Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY) in your Secrets / environment settings.'
      );
      return;
    }
    try {
      const { user } = await signInWithEmailSupabase(trimmedEmail, loginPassword);
      if (!user) {
        setErrorMsg('Unable to complete sign-in. Please verify your email and password.');
        return;
      }

      const officer = await supabaseSync.loadOrCreateOfficerProfile(user);
      storage.setCurrentUser(officer);
      onSuccess(officer);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    if (!cleanEmail || !password) {
      setErrorMsg('Email address and password are required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const ready = await ensureSupabaseInitialized();
    setSupabaseReady(ready);
    if (!ready) {
      setLoading(false);
      setErrorMsg(
        'Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY) in your Secrets / environment settings.'
      );
      return;
    }
    const selectedStation = stations.find(s => s.id === stationId) || stations[0];
    const cleanName = name.trim().slice(0, 160) || cleanEmail.split('@')[0];
    const cleanBadge =
      badgeId
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\-]/g, '-')
        .slice(0, 64) || `GPS-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultRank = GPS_RANKS_BY_ROLE[role]?.[0] || 'Inspector (CID)';

    const profileOverride: Partial<Officer> = {
      name: cleanName,
      badgeId: cleanBadge,
      rank: defaultRank,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      role,
      email: cleanEmail,
      avatarUrl: getPlaceholderImage('officer', cleanName),
    };

    try {
      storage.setPendingProfileOverride(profileOverride);
      const { user, session } = await signUpWithEmailSupabase(cleanEmail, password, {
        name: cleanName,
        badge_id: cleanBadge,
        rank: defaultRank,
        station_id: selectedStation.id,
        station_name: selectedStation.name,
        role,
      });

      if (user && session) {
        const officer = await supabaseSync.loadOrCreateOfficerProfile(user, profileOverride);
        storage.setCurrentUser(officer);
        onSuccess(officer);
        if (onClose) onClose();
        return;
      }

      // With Confirm Email = OFF, attempt immediate sign-in if session wasn't returned directly
      if (user && !session) {
        try {
          const signInRes = await signInWithEmailSupabase(cleanEmail, password);
          if (signInRes.user) {
            const officer = await supabaseSync.loadOrCreateOfficerProfile(
              signInRes.user,
              profileOverride
            );
            storage.setCurrentUser(officer);
            onSuccess(officer);
            if (onClose) onClose();
            return;
          }
        } catch {
          // Email confirmation is likely still ON in Supabase project
        }
        setInfoMsg(
          'Account created! If email confirmation is enabled on your Supabase project, confirm your email or disable "Confirm email" in Supabase Auth settings, then log in.'
        );
        setIsSignUp(false);
        setLoginEmail(cleanEmail);
      }
    } catch (err: any) {
      storage.setPendingProfileOverride(null);
      setErrorMsg(err?.message || 'Sign-up failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <div
      className={`bg-white rounded-2xl ${
        isFullPage ? 'max-w-md' : 'max-w-md'
      } w-full shadow-2xl border border-slate-300 overflow-hidden max-h-[94vh] flex flex-col`}
    >
      {/* Header Ribbon */}
      <div className="bg-[#0A2A66] text-white p-5 sm:p-6 border-b-4 border-[#C9A227] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-950 border-2 border-[#C9A227] flex items-center justify-center text-[#C9A227] shadow-inner shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-300 uppercase font-semibold block">
                Ghana Police Service
              </span>
              <h2 className="text-lg font-bold font-serif uppercase tracking-wide text-white">
                GPS Case Tracker
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                {isSignUp
                  ? 'Create Officer Account (Email & Password)'
                  : 'Officer Sign In (Email & Password)'}
              </p>
            </div>
          </div>

          {onClose && !isFullPage && (
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-900/80 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
        {!supabaseReady && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 rounded-lg text-xs flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Supabase credentials (<code>SUPABASE_URL</code> / <code>VITE_SUPABASE_URL</code> and{' '}
              <code>SUPABASE_ANON_KEY</code> / <code>VITE_SUPABASE_ANON_KEY</code>) are not configured in the environment.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-lg text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Login / Sign Up Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              !isSignUp
                ? 'border-[#0A2A66] text-[#0A2A66]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              isSignUp
                ? 'border-[#0A2A66] text-[#0A2A66]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Login Form */}
        {!isSignUp ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="officer@gps.gov.gh"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A2A66] hover:bg-[#071D49] disabled:opacity-60 text-white font-bold text-xs py-3 rounded-lg shadow-md cursor-pointer transition-colors flex items-center justify-center space-x-2 border-b-2 border-[#C9A227]"
            >
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              <span>{loading ? 'Signing In...' : 'Sign In to Case Tracker'}</span>
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              New officer?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
                className="font-bold text-[#0A2A66] hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="officer.name@gps.gov.gh"
                  maxLength={254}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Officer Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Kwame Mensah"
                    maxLength={160}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Badge ID (Optional)
                </label>
                <div className="relative">
                  <Award className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="GPS-CID-4821"
                    maxLength={64}
                    value={badgeId}
                    onChange={e => setBadgeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono uppercase focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as OfficerRole)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0A2A66] focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                >
                  <option value="counter_nco">Counter NCO</option>
                  <option value="station_officer">Station Officer</option>
                  <option value="investigator">CID Investigator</option>
                  <option value="senior_officer">Senior Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Station
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={stationId}
                    onChange={e => setStationId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                  >
                    {stations.map(stn => (
                      <option key={stn.id} value={stn.id}>
                        {stn.name} ({stn.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A2A66] hover:bg-[#071D49] disabled:opacity-60 text-white font-bold text-xs py-3 rounded-lg shadow-md cursor-pointer transition-colors mt-1 flex items-center justify-center space-x-2 border-b-2 border-[#C9A227]"
            >
              <UserCheck className="w-4 h-4 text-[#C9A227]" />
              <span>{loading ? 'Creating Account...' : 'Sign Up & Enter Dashboard'}</span>
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
                className="font-bold text-[#0A2A66] hover:underline cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-6 bg-radial from-slate-800 to-slate-950">
        <div className="mb-4 text-center">
          <p className="text-xs tracking-widest text-[#C9A227] uppercase font-bold font-mono">
            Republic of Ghana • Ghana Police Service
          </p>
        </div>
        {card}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
      {card}
    </div>
  );
};
