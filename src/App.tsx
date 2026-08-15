import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeSync } from './components/common/ThemeSync';
import { AppRoutes } from './routes/AppRoutes';

/**
 * Application shell.
 *
 * Navigation moved from component state to real URLs in Phase 3A, so the router
 * now wraps the providers. Screen composition lives in AppRoutes; data and
 * toast providers are mounted by ProtectedLayout, below the auth gate.
 */
export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* Reconciles the device theme with the account's theme_preference. */}
          <ThemeSync />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
