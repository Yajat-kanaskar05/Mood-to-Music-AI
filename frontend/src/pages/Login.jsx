import React from 'react';
import LoginForm from '../components/LoginForm';

export default function Login({ onAuthSuccess, onBackToHome }) {
  return (
    <div className="login-page-container">
      <div className="login-backdrop-glow"></div>
      <LoginForm
        onSuccess={onAuthSuccess}
        onCancel={onBackToHome}
      />
    </div>
  );
}
