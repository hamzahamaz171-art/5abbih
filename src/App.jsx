import { Navigate, Routes, Route } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthProvider } from './context/AuthContext';
import { SelectedPlayerProvider } from './context/SelectedPlayerContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SetupRequired from './components/SetupRequired';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequired />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <SelectedPlayerProvider>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/signup" element={<SignUp />} />

            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="/alerts" element={<Alerts />} />

            <Route
              path="/players"
              element={(
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/settings"
              element={(
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              )}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SelectedPlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}