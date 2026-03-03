import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Tab,
  Tabs,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';

function LoginPage() {
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper: fetch /api/me/ and route to /admin if admin, else /home
  const postLoginRedirect = async (accessToken) => {
    try {
      const res = await fetch('/api/me/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const me = await res.json();
        localStorage.setItem('isStaff', me.is_staff || me.is_superuser ? 'true' : 'false');
        localStorage.setItem('userGroups', JSON.stringify(me.groups || []));
        const isAdmin = me.is_staff || me.is_superuser || (me.groups && me.groups.length > 0);
        navigate(isAdmin ? '/admin' : '/home');
      } else {
        navigate('/home');
      }
    } catch {
      navigate('/home');
    }
  };

  const handleUsernameLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('username', data.username);
        await postLoginRedirect(data.access);
      } else {
        const err = await response.json();
        setError(err.detail || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/send/otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setOtpSent(true);
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to send OTP.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/verify/otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('username', data.username);
        await postLoginRedirect(data.access);
      } else {
        const err = await response.json();
        setError(err.message || 'Invalid OTP.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #405de6 0%, #5851db 15%, #833ab4 35%, #c13584 55%, #e1306c 75%, #fd1d1d 90%, #fcb045 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 4,
          overflow: 'hidden',
          p: 0,
        }}
      >
        {/* Top accent bar */}
        <Box
          sx={{
            height: 5,
            background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)',
          }}
        />

        <Box sx={{ px: 4, pt: 4, pb: 4 }}>
          {/* Logo & Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                mb: 1.5,
                boxShadow: '0 4px 20px rgba(131,58,180,0.4)',
              }}
            >
              <Typography
                sx={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                S
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: -1,
              }}
            >
              sqip
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your smart queue, anytime.
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setError(''); setOtpSent(false); }}
            variant="fullWidth"
            sx={{
              mb: 3,
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
                height: 3,
                borderRadius: 2,
              },
            }}
          >
            <Tab label="Username" icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
            <Tab label="Email OTP" icon={<EmailOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          </Tabs>

          {/* Username Login */}
          {tab === 0 && (
            <Box>
              <TextField
                fullWidth
                placeholder="Type your username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameLogin()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowUser(!showUser)} edge="end">
                        {showUser ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                type={showUser ? 'text' : 'password'}
                sx={{ mb: 2.5 }}
                variant="outlined"
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleUsernameLogin}
                disabled={loading || !username}
                sx={{ py: 1.5, fontSize: '1rem', letterSpacing: 1 }}
              >
                {loading ? 'Signing in…' : 'LOGIN'}
              </Button>
            </Box>
          )}

          {/* OTP Login */}
          {tab === 1 && (
            <Box>
              <TextField
                fullWidth
                placeholder="Type your email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
                variant="outlined"
              />
              {!otpSent ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  sx={{ py: 1.5, fontSize: '1rem', letterSpacing: 1 }}
                >
                  {loading ? 'Sending…' : 'SEND OTP'}
                </Button>
              ) : (
                <>
                  <TextField
                    fullWidth
                    placeholder="Enter OTP"
                    label="OTP Code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlinedIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                    variant="outlined"
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleVerifyOtp}
                    disabled={loading || !otp}
                    sx={{ py: 1.5, fontSize: '1rem', letterSpacing: 1 }}
                  >
                    {loading ? 'Verifying…' : 'VERIFY OTP'}
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    sx={{ mt: 1, textTransform: 'none', color: 'text.secondary' }}
                  >
                    Resend OTP
                  </Button>
                </>
              )}
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              SQIP — Smart Queue Platform
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <LockOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Secure login · Your data is protected
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;