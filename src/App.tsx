import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TournamentsView } from './components/TournamentsView';
import { MatchesView } from './components/MatchesView';
import { TournamentDetailView } from './components/TournamentDetailView';
import { RegisterModal } from './components/RegisterModal';
import { MatchDetailView } from './components/MatchDetailView';
import { BetsView } from './components/BetsView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { ManagerPanel } from './components/ManagerPanel';
import { AuthModal } from './components/AuthModal';
import { ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const CSLoader: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98;
        }
        const next = prev + Math.floor(Math.random() * 8) + 3;
        return next > 98 ? 98 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const loadingTexts = [
    { min: 0, text: 'CONNECTING TO VOLK SERVER (203.161.55.65)...' },
    { min: 25, text: 'ESTABLISHING SECURE DATABASE HANDSHAKE...' },
    { min: 50, text: 'LOADING TOURNAMENT BRACKETS AND RULES...' },
    { min: 75, text: 'SYNCHRONIZING USER XP AND WALLET BALANCE...' },
    { min: 90, text: 'VERIFYING TELEGRAM INTEGRITY AND SESSION...' }
  ];

  const currentText = loadingTexts.reduce((acc, curr) => {
    if (progress >= curr.min) return curr.text;
    return acc;
  }, loadingTexts[0].text);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#040406',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif'
    }}>
      {/* Background CS illustration with overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("/tactical_soldier.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.12,
        zIndex: 1
      }} />

      {/* Dark vignette gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle, transparent 20%, #040406 90%)',
        zIndex: 2
      }} />

      {/* Center Logo */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        zIndex: 3,
        marginBottom: '40px'
      }}>
        <img 
          src="/wolf_logo.png" 
          alt="VOLK Logo" 
          style={{
            width: '120px',
            height: 'auto',
            filter: 'drop-shadow(0 0 15px rgba(255, 92, 0, 0.45))',
            animation: 'pulse 2.5s infinite ease-in-out'
          }} 
        />
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(255, 92, 0, 0.45)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(255, 92, 0, 0.7)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(255, 92, 0, 0.45)); }
          }
        `}</style>
        <span style={{
          fontSize: '18px',
          fontWeight: '900',
          color: 'white',
          letterSpacing: '5px',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
          marginTop: '8px'
        }}>
          VOLK 13:03
        </span>
      </div>

      {/* Loading CS style section */}
      <div style={{
        width: '80%',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 3
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          fontWeight: '800',
          color: '#8F8F9B',
          letterSpacing: '1px'
        }}>
          <span style={{ animation: 'blink 1.2s infinite' }}>{currentText}</span>
          <span style={{ color: '#FF5C00', fontFamily: 'monospace', fontSize: '12px' }}>{progress}%</span>
        </div>
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>

        {/* CSS Loading Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
          padding: '1px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FF5C00, #FF8C00)',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(255, 92, 0, 0.6)',
            transition: 'width 0.15s ease-out'
          }} />
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  // Navigation states
  const [view, setView] = useState<'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin' | 'manager'>('home');
  
  // Selection states
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);

  const { toast, hideToast, isAuthenticated, isLoading, authLogin } = useApp();

  // Navigation controller helper
  const navigateTo = (targetView: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin' | 'manager') => {
    setView(targetView);
    setSelectedTournamentId(null);
    setSelectedMatchId(null);
    setRegisteringTournamentId(null);
  };

  // SUCCESS TOAST DISMISS EFFECT
  React.useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show, hideToast]);

  // ─── Loading Screen ───
  if (isLoading) {
    return <CSLoader />;
  }

  // ─── Auth Gate ───
  if (!isAuthenticated && !window.location.search.includes('manager=true') && !window.location.pathname.startsWith('/admin')) {
    return (
      <AuthModal 
        onLogin={authLogin}
        isLoading={isLoading}
      />
    );
  }

  // View selection renderer
  const renderCurrentView = () => {
    if (selectedMatchId) {
      return (
        <MatchDetailView 
          matchId={selectedMatchId}
          onBack={() => setSelectedMatchId(null)}
        />
      );
    }

    if (selectedTournamentId) {
      return (
        <TournamentDetailView 
          tournamentId={selectedTournamentId}
          onBack={() => setSelectedTournamentId(null)}
          onSelectMatch={(id) => setSelectedMatchId(id)}
          onOpenRegister={(id) => setRegisteringTournamentId(id)}
        />
      );
    }

    switch (view) {
      case 'home':
        return (
          <HomeView 
            onNavigate={navigateTo}
            onSelectTournament={(id) => setSelectedTournamentId(id)}
            onSelectMatch={(id) => setSelectedMatchId(id)}
            onOpenRegister={(id) => setRegisteringTournamentId(id)}
          />
        );
      case 'tournaments':
        return (
          <TournamentsView 
            onSelectTournament={(id) => setSelectedTournamentId(id)}
          />
        );
      case 'matches':
        return (
          <MatchesView 
            onSelectMatch={setSelectedMatchId}
            onSelectTournament={setSelectedTournamentId}
          />
        );
      case 'bets':
        return <BetsView />;
      case 'profile':
        return <ProfileView onNavigate={navigateTo} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <HomeView onNavigate={navigateTo} onSelectTournament={setSelectedTournamentId} onSelectMatch={setSelectedMatchId} onOpenRegister={setRegisteringTournamentId} />;
    }
  };

  const isManagerSite = window.location.pathname.startsWith('/admin') || window.location.search.includes('manager=true') || view === 'manager';
  const isAdminSite = window.location.search.includes('admin=true') || view === 'admin';

  if (isManagerSite) {
    return (
      <div className="admin-site-container">
        <ManagerPanel onExitAdmin={() => {
          if (view === 'manager') {
            navigateTo('profile');
          } else {
            window.history.replaceState({}, document.title, '/');
            navigateTo('home');
          }
        }} />

        {/* Global Toast Alerts */}
        <div className={`toast-msg ${toast.show ? 'show' : ''}`} style={{
          borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'
        }}>
          <ShieldCheck size={18} color={toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'} />
          <span style={{ fontSize: '12px' }}>{toast.message}</span>
        </div>
      </div>
    );
  }

  if (isAdminSite) {
    return (
      <div className="admin-site-container">
        <AdminPanel onExitAdmin={() => {
          if (window.location.search.includes('admin=true')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          navigateTo('home');
        }} />

        {/* Global Toast Alerts */}
        <div className={`toast-msg ${toast.show ? 'show' : ''}`} style={{
          borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'
        }}>
          <ShieldCheck size={18} color={toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'} />
          <span style={{ fontSize: '12px' }}>{toast.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tg-app-container">
      
      {/* Framed Mobile Mockup view */}
      <div className="tg-app-mockup">
        
        {/* Top Header */}
        <Header onNavigate={navigateTo} currentView={view} />

        {/* Dynamic Page Scroll Area */}
        {renderCurrentView()}

        {/* Global Toast Alerts */}
        <div className={`toast-msg ${toast.show ? 'show' : ''}`} style={{
          borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'
        }}>
          <ShieldCheck size={18} color={toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#FF5C00'} />
          <span style={{ fontSize: '12px' }}>{toast.message}</span>
        </div>

        {/* Registration Modal */}
        {registeringTournamentId && (
          <RegisterModal 
            tournamentId={registeringTournamentId}
            onClose={() => setRegisteringTournamentId(null)}
            onSuccess={() => {
              setRegisteringTournamentId(null);
              setSelectedTournamentId(registeringTournamentId);
            }}
          />
        )}

        {/* Bottom Navigation */}
        <BottomNav currentView={view} onNavigate={navigateTo} />

      </div>

    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
