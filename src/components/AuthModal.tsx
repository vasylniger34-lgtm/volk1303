import React, { useState } from 'react';
import { Shield, User, ArrowRight, Loader2, Zap } from 'lucide-react';

interface AuthModalProps {
  onLogin: (telegramData: { id: string; username: string; first_name: string }) => void;
  isLoading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, isLoading = false }) => {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'welcome' | 'input'>('welcome');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Simulate Telegram-style login with username as identifier
    const cleanUsername = username.replace('@', '').trim();
    onLogin({
      id: `tg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      username: cleanUsername,
      first_name: cleanUsername
    });
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        
        {/* Glowing background orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />

        {/* Logo Area */}
        <div className="auth-logo-area">
          <div className="auth-logo-icon">
            <Shield size={32} color="#FF5C00" />
          </div>
          <h1 className="auth-title">VOLKI</h1>
          <span className="auth-subtitle">13:03 ESPORTS</span>
        </div>

        {step === 'welcome' ? (
          <div className="auth-content">
            <p className="auth-description">
              Турнірна платформа для кіберспорту. 
              Бери участь у турнірах, ставки на матчі та заробляй 🪙
            </p>

            <div className="auth-features">
              <div className="auth-feature-item">
                <Zap size={14} color="#FF5C00" />
                <span>LIVE турніри CS2</span>
              </div>
              <div className="auth-feature-item">
                <Shield size={14} color="#8B5CF6" />
                <span>Безпечні ставки</span>
              </div>
              <div className="auth-feature-item">
                <User size={14} color="#10B981" />
                <span>Рівні та досвід</span>
              </div>
            </div>

            <button
              onClick={() => setStep('input')}
              className="auth-btn-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.02C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4582 14.0044 10.4254 13.9928 10.3953C13.9812 10.3652 13.9609 10.3388 13.9341 10.3189C13.88 10.28 13.8 10.29 13.74 10.3C13.65 10.32 12.25 11.24 9.52 13.06C9.12 13.34 8.76 13.47 8.44 13.46C8.08 13.45 7.4 13.26 6.89 13.11C6.26 12.91 5.77 12.81 5.81 12.45C5.83 12.27 6.08 12.09 6.55 11.9C9.47 10.63 11.41 9.79 12.38 9.39C15.16 8.23 15.73 8.03 16.11 8.03C16.19 8.03 16.38 8.05 16.5 8.15C16.6 8.23 16.63 8.34 16.64 8.42C16.63 8.48 16.65 8.66 16.64 8.8Z" fill="white"/>
              </svg>
              Увійти через Telegram
            </button>

            <p className="auth-hint">
              Надішліть свій Telegram контакт для входу
            </p>
          </div>
        ) : (
          <div className="auth-content">
            <p className="auth-description" style={{ marginBottom: '20px' }}>
              Введіть ваш Telegram username для створення акаунту або входу
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <span className="auth-input-prefix">@</span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="your_username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={!username.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="auth-spinner" />
                    Підключення...
                  </>
                ) : (
                  <>
                    Увійти
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => setStep('welcome')}
              className="auth-btn-back"
            >
              ← Назад
            </button>
          </div>
        )}

        {/* Version tag */}
        <div className="auth-version">
          v1.0 · Supabase Powered
        </div>
      </div>
    </div>
  );
};
