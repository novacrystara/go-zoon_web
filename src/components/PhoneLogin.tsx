import React, { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { fetchApi, setStoredSession, StoredSession } from '../api';

interface PhoneLoginProps {
  onLoggedIn: (session: StoredSession) => void;
}

const DEMO_NUMBERS = ['+44 7700 900000', '+44 7700 900001'];

export default function PhoneLogin({ onLoggedIn }: PhoneLoginProps): React.JSX.Element {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send OTP.');
        return;
      }
      setDemoOtpHint(data.demoOtp || null);
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid OTP.');
        return;
      }
      const session: StoredSession = { customerId: data.customerId, phone: data.phone, sessionToken: data.sessionToken };
      setStoredSession(session);
      onLoggedIn(session);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col items-center justify-center p-6 text-center space-y-5" id="phone-login-screen">
      <div className="w-14 h-14 rounded-full bg-brand-blue/10 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-brand-blue" />
      </div>
      <div className="space-y-1">
        <h2 className="font-black text-lg text-slate-900">Welcome to Go-Zoon</h2>
        <p className="text-xs text-slate-500 max-w-xs">Log in with your phone number to order and track deliveries.</p>
      </div>

      <div className="w-full max-w-xs bg-blue-50 border border-blue-100 rounded-xl p-3 text-left space-y-1">
        <span className="text-[9px] font-extrabold text-brand-blue uppercase tracking-wider block">Demo Mode</span>
        <p className="text-[10px] text-blue-900 leading-relaxed">
          No SMS provider is connected yet. Use one of these demo numbers with OTP <b>123456</b>:
        </p>
        <ul className="text-[10px] font-mono text-blue-950 space-y-0.5">
          {DEMO_NUMBERS.map(n => <li key={n}>• {n}</li>)}
        </ul>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="w-full max-w-xs space-y-3">
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              required
              placeholder="+44 7700 900000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 pl-9 pr-3 border border-slate-250 rounded-lg text-[16px]"
            />
          </div>
          {error && <p className="text-[11px] text-red-500 font-semibold text-left">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-brand-orange text-white font-black rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="w-full max-w-xs space-y-3">
          {demoOtpHint && (
            <p className="text-[10px] text-slate-500">Demo OTP for this session: <b className="text-slate-800">{demoOtpHint}</b></p>
          )}
          <input
            type="text"
            required
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full h-10 px-3 border border-slate-250 rounded-lg text-[16px] tracking-widest text-center font-mono"
          />
          {error && <p className="text-[11px] text-red-500 font-semibold text-left">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-brand-orange text-white font-black rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
            className="w-full text-[11px] text-slate-400 font-semibold"
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}
