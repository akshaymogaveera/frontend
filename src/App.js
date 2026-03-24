import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage.js';
import { LoginModalProvider } from './contexts/LoginModalContext.js';
import HomePage from './pages/HomePage.js';
import AppointmentsPage from './pages/AppointmentsPage.js';
import AdminPage from './pages/AdminPage.js';
import ProfilePage from './pages/ProfilePage.js';
import OrgBookingPage from './pages/OrgBookingPage.js';

const theme = createTheme({
  palette: {
    mode: 'light',
    // Primary color is neutralized (blue is used for system primary),
    // but the main CTA uses a teal -> blue gradient defined below.
    primary: {
      main: '#007BFF',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      // Brand / headings / navigation text should use Deep Slate Blue
      primary: '#2D546E',
      secondary: '#6b7b84',
    },
    // Custom palette tokens for centralized theme usage in JS/TS
    custom: {
      teal: '#00C4CC',
      mint: '#E0F7F9',
      deepSlate: '#2D546E',
      gradientPrimary: 'linear-gradient(90deg, #00C4CC 0%, #007BFF 100%)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        containedPrimary: {
          // vibrant teal -> blue gradient for main CTAs
          background: 'linear-gradient(90deg, #00C4CC 0%, #007BFF 100%)',
          color: '#ffffff !important',
          '&:hover': {
            // slightly darker hover gradient
            background: 'linear-gradient(90deg, #00A9B0 0%, #006FE6 100%)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const isStaff = localStorage.getItem('isStaff') === 'true';
  const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
  const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';
  return isStaff || groups.length > 0 || isOrgAdmin ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <LoginModalProvider>
          <Routes>
          {/* Public home page - no auth required */}
          <Route path="/" element={<HomePage />} />
          
          {/* Login page */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Public org/category/appointment pages for browsing */}
          <Route path="/org/:orgId" element={<OrgBookingPage />} />
          <Route path="/org/:orgId/category/:categoryId" element={<OrgBookingPage />} />
          <Route path="/appointment/:appointmentId" element={<AppointmentsPage />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LoginModalProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
