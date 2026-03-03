import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage.js';
import HomePage from './pages/HomePage.js';
import AppointmentsPage from './pages/AppointmentsPage.js';
import AdminPage from './pages/AdminPage.js';
import OrgBookingPage from './pages/OrgBookingPage.js';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#833ab4',
      light: '#c56cd6',
      dark: '#5c1f8a',
      contrastText: '#fff',
    },
    secondary: {
      main: '#fd1d1d',
      light: '#ff6b6b',
      dark: '#c40000',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#262626',
      secondary: '#8e8e8e',
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
          background: 'linear-gradient(45deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #6a2d9f 0%, #e01010 50%, #e09a30 100%)',
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
  return token ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const isStaff = localStorage.getItem('isStaff') === 'true';
  const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
  return isStaff || groups.length > 0 ? children : <Navigate to="/home" replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
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
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/org/:orgId" element={<OrgBookingPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
