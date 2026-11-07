import React, { useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    return token && username ? { token, username } : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAuthSuccess = ({ token, username }) => {
    setUser({ token, username });
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <div className="app-root">
      {showLoginModal ? (
        <Login
          onAuthSuccess={handleAuthSuccess}
          onBackToHome={() => setShowLoginModal(false)}
        />
      ) : (
        <Home
          user={user}
          onOpenLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
