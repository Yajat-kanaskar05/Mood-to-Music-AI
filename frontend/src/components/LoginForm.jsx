import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, ArrowRight, Music } from 'lucide-react';
import { login, register } from '../api/api';

export default function LoginForm({ onSuccess, onCancel }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isRegister && !username)) {
      setError('Please fill out all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (isRegister) {
        res = await register(username.trim(), email.trim(), password);
      } else {
        res = await login(email.trim(), password);
      }

      const { token, username: returnedUsername } = res.data;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', returnedUsername || username || email.split('@')[0]);
        if (onSuccess) onSuccess({ token, username: returnedUsername || username });
      }
    } catch (err) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <div className="auth-icon-wrap">
          <Music size={28} className="text-accent" />
        </div>
        <h2 className="auth-title">
          {isRegister ? 'Join Mood-to-Music' : 'Welcome Back'}
        </h2>
        <p className="auth-subtitle">
          {isRegister
            ? 'Save your listening history and get tailored collaborative filtering recommendations.'
            : 'Sign in to access your saved profile and listening history.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="auth-tabs">
        <button
          type="button"
          id="tab-login"
          className={`auth-tab ${!isRegister ? 'active' : ''}`}
          onClick={() => {
            setIsRegister(false);
            setError('');
          }}
        >
          <LogIn size={16} />
          Sign In
        </button>
        <button
          type="button"
          id="tab-register"
          className={`auth-tab ${isRegister ? 'active' : ''}`}
          onClick={() => {
            setIsRegister(true);
            setError('');
          }}
        >
          <UserPlus size={16} />
          Create Account
        </button>
      </div>

      {error && (
        <div className="auth-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <div className="form-group">
            <label htmlFor="auth-username" className="form-label">Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="auth-username"
                type="text"
                className="text-input with-left-icon"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isRegister}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="auth-email" className="form-label">Email Address</label>
          <div className="input-with-icon">
            <Mail size={18} className="input-icon" />
            <input
              id="auth-email"
              type="email"
              className="text-input with-left-icon"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="auth-password" className="form-label">Password</label>
          <div className="input-with-icon">
            <Lock size={18} className="input-icon" />
            <input
              id="auth-password"
              type="password"
              className="text-input with-left-icon"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          id="auth-submit-btn"
          className="btn-primary-gradient w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn-ghost w-full mt-2"
            onClick={onCancel}
          >
            Continue as Guest
          </button>
        )}
      </form>
    </div>
  );
}
