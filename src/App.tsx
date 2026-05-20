import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TournamentsView } from './components/TournamentsView';
import { TournamentDetailView } from './components/TournamentDetailView';
import { RegisterModal } from './components/RegisterModal';
import { MatchDetailView } from './components/MatchDetailView';
import { BetsView } from './components/BetsView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { ShieldCheck, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  // Navigation states
  const [view, setView] = useState<'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin'>('home');
  
  // Selection states
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);

  const { toast, hideToast, isAuthenticated, isLoading, authLogin } = useApp();

  // Navigation controller helper
  const navigateTo = (targetView: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin') => {
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
  }, [toast.show]);

  // ─── Loading Screen ───
  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#050508',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.15), rgba(139, 92, 246, 0.1))',
          border: '1px solid rgba(255, 92, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Loader2 size={28} color="#FF5C00" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '12px',
          fontWeight: '800',
          color: '#51515E',
          letterSpacing: '3px',
          textTransform: 'uppercase'
        }}>
          VOLKI 13:03
        </span>
      </div>
    );
  }

  // ─── Auth Gate ───
  if (!isAuthenticated) {
    return (
      <AuthModal 
        onLogin={authLogin}
        isLoading={isLoading}
      />
    );
  }

  // View selection renderer
  const renderCurrentView = () => {
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

    if (selectedMatchId) {
      return (
        <MatchDetailView 
          matchId={selectedMatchId}
          onBack={() => setSelectedMatchId(null)}
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
          <div className="scroll-container" style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
              Турнірні Матчі
            </h2>
            <p style={{ fontSize: '11px', color: '#8F8F9B', marginBottom: '20px' }}>
              Оберіть активну сітку в меню "Турніри" або відкрийте деталі гри нижче.
            </p>
            <HomeView 
              onNavigate={navigateTo}
              onSelectTournament={(id) => setSelectedTournamentId(id)}
              onSelectMatch={(id) => setSelectedMatchId(id)}
              onOpenRegister={(id) => setRegisteringTournamentId(id)}
            />
          </div>
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

  const isAdminSite = window.location.search.includes('admin=true') || view === 'admin';

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
