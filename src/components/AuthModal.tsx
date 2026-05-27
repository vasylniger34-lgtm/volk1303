import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User, Loader2, Zap, Send } from 'lucide-react';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        requestContact: (callback: (sent: boolean, event?: { responseUnsafe?: { contact?: { user_id: number; first_name: string; last_name?: string; phone_number: string } } }) => void) => void;
        platform?: string;
        version?: string;
        themeParams?: Record<string, string>;
      };
    };
  }
}

interface AuthModalProps {
  onLogin: (telegramData: { id: string; username: string; first_name: string }) => void;
  isLoading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, isLoading = false }) => {
  const [isTelegram] = useState(() => {
    return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user;
  });
  const [contactRequested, setContactRequested] = useState(false);
  const [telegramUser] = useState<{ id: number; username?: string; first_name: string } | null>(() => {
    return (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) || null;
  });

  // Detect Telegram WebApp environment
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      const user = tg.initDataUnsafe?.user;
      if (user) {
        // If they have shared their contact before, auto-login them immediately
        const hasSharedContact = localStorage.getItem('volk_contact_shared') === 'true';
        if (hasSharedContact) {
          onLogin({
            id: String(user.id),
            username: user.username || user.first_name,
            first_name: user.first_name
          });
        }
      }
    }
  }, [onLogin]);

  // Auto-login if Telegram user data is available
  const handleTelegramAutoLogin = useCallback(() => {
    if (telegramUser) {
      onLogin({
        id: String(telegramUser.id),
        username: telegramUser.username || telegramUser.first_name,
        first_name: telegramUser.first_name
      });
    }
  }, [telegramUser, onLogin]);

  // Request contact via Telegram WebApp API
  const handleRequestContact = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.requestContact) {
      // Fallback - if requestContact not available, use auto-login
      if (telegramUser) {
        handleTelegramAutoLogin();
      }
      return;
    }

    setContactRequested(true);
    
    tg.requestContact((sent: boolean, event?: { responseUnsafe?: { contact?: { user_id: number; first_name: string; last_name?: string; phone_number: string } } }) => {
      setContactRequested(false);
      
      if (sent && event?.responseUnsafe?.contact) {
        const contact = event.responseUnsafe.contact;
        localStorage.setItem('volk_contact_shared', 'true');
        onLogin({
          id: String(contact.user_id || telegramUser?.id || Date.now()),
          username: telegramUser?.username || contact.first_name,
          first_name: contact.first_name
        });
      } else if (sent) {
        // Contact sent but no data in response — use telegramUser
        if (telegramUser) {
          localStorage.setItem('volk_contact_shared', 'true');
          handleTelegramAutoLogin();
        }
      }
      // If not sent, user cancelled — do nothing
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
          <h1 className="auth-title">VOLK 1303</h1>
          <span className="auth-subtitle">ESPORTS PLATFORM</span>
        </div>

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

          {isTelegram && telegramUser ? (
            /* ─── Telegram Mode: Send Contact & Quick ID Login ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={handleRequestContact}
                className="auth-btn-primary"
                disabled={contactRequested || isLoading}
                style={{ width: '100%' }}
              >
                {contactRequested ? (
                  <>
                    <Loader2 size={16} className="auth-spinner" />
                    Очікую контакт...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Надіслати контакт
                  </>
                )}
              </button>

              <button
                onClick={handleTelegramAutoLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#8F8F9B',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#8F8F9B';
                }}
              >
                Продовжити як @{telegramUser.username || telegramUser.first_name}
              </button>

              <p className="auth-hint" style={{ marginTop: '4px' }}>
                Реєструйтеся через «Надіслати контакт» або увійдіть під своїм Telegram ID
              </p>
            </div>
          ) : (
            /* ─── Browser Mode: Blocked ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div style={{
                padding: '16px',
                background: 'rgba(255, 92, 0, 0.05)',
                border: '1px solid rgba(255, 92, 0, 0.15)',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '4px'
              }}>
                <p style={{ color: '#FF5C00', fontSize: '13px', fontWeight: '800', marginBottom: '6px', fontFamily: 'Outfit, sans-serif' }}>
                  ВХІД ЗАБЛОКОВАНО
                </p>
                <p style={{ color: '#8F8F9B', fontSize: '11px', lineHeight: '1.5' }}>
                  Ця платформа працює виключно всередині Telegram WebApp. Будь ласка, відкрийте наш бот для входу.
                </p>
              </div>

              <a
                href="https://t.me/volk1303bot"
                target="_blank"
                rel="noopener noreferrer"
                className="auth-btn-primary"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <Send size={18} />
                Відкрити бот у Telegram
              </a>
            </div>
          )}
        </div>

        {/* Version tag */}
        <div className="auth-version">
          v1.0 · {isTelegram ? `Telegram ${window.Telegram?.WebApp?.platform || 'WebApp'}` : 'Browser Mode'}
          <div style={{ fontSize: '8px', opacity: 0.5, marginTop: '4px' }}>
            debug: tg={String(!!window.Telegram?.WebApp)} user={String(!!window.Telegram?.WebApp?.initDataUnsafe?.user)} initData={JSON.stringify(window.Telegram?.WebApp?.initDataUnsafe || {})}
          </div>
        </div>
      </div>
    </div>
  );
};
