import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  Divider,
  Paper,
  useTheme,
  useMediaQuery,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';

/* ──────────────────────────────────────────
   Country dial-code list (shared constant)
────────────────────────────────────────── */
const COUNTRIES = [
  { code: 'IN', label: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'US', label: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', label: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', label: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AE', label: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'SG', label: 'Singapore', dial: '+65', flag: '🇸🇬' },
];

const defaultCountry = COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0]; // India

/* ──────────────────────────────────────────
   Country + phone input widget
────────────────────────────────────────── */
function PhoneInput({ country, setCountry, phone, setPhone, onEnter, label = 'Phone number', compact = false }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, mb: compact ? 1.5 : 2, alignItems: 'stretch' }}>
      {/* Country prefix chip */}
      <Select
        value={country.code}
        onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value) || defaultCountry)}
        size="small"
        sx={{
          minWidth: compact ? 82 : 110,
          borderRadius: 2,
          fontWeight: 500,
          '& .MuiSelect-select': { py: compact ? '6px' : '8px', px: 1 },
        }}
        renderValue={(v) => {
          const c = COUNTRIES.find((x) => x.code === v);
          return c ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{c.flag} <span style={{ fontSize: compact ? '0.82rem' : '0.9rem' }}>{c.dial}</span></span> : v;
        }}
      >
        {COUNTRIES.map((c) => (
          <MenuItem key={c.code} value={c.code}>
            {c.flag} {c.label} ({c.dial})
          </MenuItem>
        ))}
      </Select>
      {/* Phone number field */}
      <TextField
        fullWidth
        label={label}
        placeholder="9876543210"
        size="small"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PhoneOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        variant="outlined"
        type="tel"
      />
    </Box>
  );
}

/* ──────────────────────────────────────────
   Main component
────────────────────────────────────────── */
function LoginForm({ redirectFrom = '/', preSelectOrg = null, preSelectCat = null, onClose = null, isMobileSheet = false }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  /* ── registration form state ── */
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regCountry, setRegCountry] = useState(defaultCountry);
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  /* ── login form state ── */
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginCountry, setLoginCountry] = useState(defaultCountry);
  const [loginUsePhone, setLoginUsePhone] = useState(true);

  /* ── OTP section state (collapsible) ── */
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  /* ─────────────────────────────────────── */

  const postLoginRedirect = async (accessToken) => {
    try {
      const res = await fetch('/api/me/', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const me = await res.json();
        localStorage.setItem('isStaff', me.is_staff || me.is_superuser ? 'true' : 'false');
        localStorage.setItem('userGroups', JSON.stringify(me.groups || []));
        const isAdmin = me.is_staff || me.is_superuser || (me.groups && me.groups.length > 0);
        window.dispatchEvent(new CustomEvent('sqip:login', { detail: { user: me } }));
        window.dispatchEvent(new CustomEvent('sqip:postLogin', {
          detail: { from: redirectFrom, preSelectOrg, preSelectCat },
        }));
        if (preSelectOrg && preSelectCat) {
          if (onClose) onClose();
          navigate('/', { state: { preSelectOrg, preSelectCat }, replace: true });
        } else if (redirectFrom && redirectFrom !== '/login') {
          if (onClose) onClose();
          navigate(redirectFrom, { replace: true });
        } else {
          if (onClose) onClose();
          navigate(isAdmin ? '/admin' : '/', { replace: true });
        }
      } else {
        if (onClose) onClose();
        navigate(redirectFrom, { replace: true });
      }
    } catch {
      if (onClose) onClose();
      navigate(redirectFrom, { replace: true });
    }
  };

  const storeTokens = (data) => {
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    localStorage.setItem('userId', data.id);
    localStorage.setItem('username', data.username);
    // persist readable name parts for navbar/profile
    if (data.first_name !== undefined) localStorage.setItem('firstName', data.first_name || '');
    if (data.last_name !== undefined) localStorage.setItem('lastName', data.last_name || '');
  };

  /* ── Register ── */
  const handleRegister = async () => {
    setRegError('');
    if (!regFirstName.trim()) { setRegError('First name is required.'); return; }
    if (!regPhone.trim()) { setRegError('Phone number is required.'); return; }
    setRegLoading(true);
    try {
      const fullPhone = `${regCountry.dial}${regPhone.trim()}`;
      const res = await fetch('/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: regFirstName.trim(),
          last_name: regLastName.trim(),
          phone: fullPhone,
          email: regEmail.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        storeTokens(data);
        await postLoginRedirect(data.access);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.errors) {
          const msgs = Object.values(err.errors).flat().join(' ');
          setRegError(msgs || 'Registration failed.');
        } else {
          setRegError(err.message || 'Registration failed.');
        }
      }
    } catch {
      setRegError('Network error. Please try again.');
    }
    setRegLoading(false);
  };

  /* ── Login ── */
  const handleLogin = async () => {
    setLoginError('');
    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your phone number or username.');
      return;
    }
    setLoginLoading(true);
    try {
      const identifier = loginUsePhone
        ? `${loginCountry.dial}${loginIdentifier.trim()}`
        : loginIdentifier.trim();
      const res = await fetch('/api/auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (res.ok) {
        const data = await res.json();
        storeTokens(data);
        await postLoginRedirect(data.access);
      } else {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.message || err.detail || 'Login failed. User not found.');
      }
    } catch {
      setLoginError('Network error. Please try again.');
    }
    setLoginLoading(false);
  };

  /* ── OTP ── */
  const handleSendOtp = async () => {
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/send/otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });
      if (res.ok) { setOtpSent(true); }
      else {
        const err = await res.json().catch(() => ({}));
        setOtpError(err.message || 'Failed to send OTP.');
      }
    } catch { setOtpError('Network error. Please try again.'); }
    setOtpLoading(false);
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/verify/otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp }),
      });
      if (res.ok) {
        const data = await res.json();
        storeTokens(data);
        await postLoginRedirect(data.access);
      } else {
        const err = await res.json().catch(() => ({}));
        setOtpError(err.message || 'Invalid OTP.');
      }
    } catch { setOtpError('Network error. Please try again.'); }
    setOtpLoading(false);
  };

  /* ─────────────────────────────────────── */

  // Shared content — used by both desktop and mobile
  // compact = true means tighter spacing / smaller inputs
  const compact = isMobileSheet || isXs;
  const inputSize = compact ? 'small' : 'medium';
  const px = compact ? 2.5 : 4;
  const pt = compact ? 2 : 4;
  const pb = compact ? 2 : 4;

  const formContent = (
    <Box sx={{ px, pt, pb, width: '100%' }}>

      {/* ────── Header ────── */}
      <Typography
        variant="h5"
        fontWeight={700}
        gutterBottom
        sx={{ fontSize: compact ? '1.2rem' : '1.5rem', letterSpacing: -0.3 }}
      >
        Join SQIP
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: compact ? 2 : 3, fontSize: compact ? '0.82rem' : '0.875rem' }}>
        Create an account to book appointments seamlessly.
      </Typography>

      {/* ────── First + Last name ────── */}
      <Box sx={{ display: 'flex', gap: 1, mb: compact ? 1.5 : 2 }}>
        <TextField
          sx={{ flex: 1 }}
          size={inputSize}
          label="First name"
          placeholder="First name"
          value={regFirstName}
          onChange={(e) => setRegFirstName(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlineIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
        />
        <TextField
          sx={{ flex: 1 }}
          size={inputSize}
          label="Last name"
          placeholder="Last name"
          value={regLastName}
          onChange={(e) => setRegLastName(e.target.value)}
          variant="outlined"
        />
      </Box>

      {/* ────── Phone ────── */}
      <PhoneInput
        compact={compact}
        country={regCountry}
        setCountry={setRegCountry}
        phone={regPhone}
        setPhone={setRegPhone}
        onEnter={handleRegister}
        label="Phone number"
      />

      {/* ────── Email ────── */}
      <TextField
        fullWidth
        size={inputSize}
        label="Email (optional)"
        placeholder="your@email.com"
        type="email"
        value={regEmail}
        onChange={(e) => setRegEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        variant="outlined"
        sx={{ mb: compact ? 1.5 : 2 }}
      />

      {regError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, py: compact ? 0 : 0.5, fontSize: compact ? '0.8rem' : undefined }}>
          {regError}
        </Alert>
      )}

      {/* ────── Create Account button ────── */}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        size={compact ? 'medium' : 'large'}
        onClick={handleRegister}
        disabled={regLoading || !regFirstName || !regPhone}
        sx={{
          py: compact ? 0.9 : 1.5,
          fontSize: compact ? '0.92rem' : '1rem',
          letterSpacing: 0.4,
          mb: compact ? 0.5 : 1,
          borderRadius: 3,
          boxShadow: (t) => t.shadows[6],
        }}
      >
        {regLoading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
      </Button>

      {/* ────── Divider ────── */}
      <Divider sx={{ my: compact ? 1.5 : 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', px: 0.5 }}>
          Already have an account?
        </Typography>
      </Divider>

      {/* ────── Sign in label ────── */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: compact ? '0.82rem' : '0.875rem', color: 'text.secondary' }}>
        Sign in
      </Typography>

      {/* ────── Toggle phone / username ────── */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: compact ? 1.5 : 2 }}>
        <Button
          size="small"
          variant={loginUsePhone ? 'contained' : 'outlined'}
          onClick={() => { setLoginUsePhone(true); setLoginIdentifier(''); setLoginError(''); }}
          sx={{ textTransform: 'none', flex: 1, fontSize: compact ? '0.78rem' : '0.8rem', py: compact ? 0.5 : 0.6, borderRadius: 2 }}
        >
          Phone
        </Button>
        <Button
          size="small"
          variant={!loginUsePhone ? 'contained' : 'outlined'}
          onClick={() => { setLoginUsePhone(false); setLoginIdentifier(''); setLoginError(''); }}
          sx={{ textTransform: 'none', flex: 1, fontSize: compact ? '0.78rem' : '0.8rem', py: compact ? 0.5 : 0.6, borderRadius: 2 }}
        >
          Username
        </Button>
      </Box>

      {/* ────── Phone or Username input ────── */}
      {loginUsePhone ? (
        <PhoneInput
          compact={compact}
          country={loginCountry}
          setCountry={setLoginCountry}
          phone={loginIdentifier}
          setPhone={setLoginIdentifier}
          onEnter={handleLogin}
          label="Your phone number"
        />
      ) : (
        <TextField
          fullWidth
          size={inputSize}
          label="Username"
          placeholder="your username"
          value={loginIdentifier}
          onChange={(e) => setLoginIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlineIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          sx={{ mb: compact ? 1.5 : 2 }}
        />
      )}

      {loginError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, py: compact ? 0 : 0.5, fontSize: compact ? '0.8rem' : undefined }}>
          {loginError}
        </Alert>
      )}

      {/* ────── Sign In button ────── */}
      <Button
        fullWidth
        variant="outlined"
        size={compact ? 'medium' : 'large'}
        onClick={handleLogin}
        disabled={loginLoading || !loginIdentifier}
        sx={{ py: compact ? 0.9 : 1.5, fontSize: compact ? '0.92rem' : '1rem', letterSpacing: 0.4, mb: compact ? 1 : 1, borderRadius: 3 }}
      >
        {loginLoading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
      </Button>

    </Box>
  );

  // On mobile sheet: no wrapper Paper (the sheet itself is the card)
  if (isMobileSheet) {
    return formContent;
  }

  // On desktop /login page: wrap with Paper so the page still has the card look
  return (
    <Paper elevation={0} sx={{ p: 0, borderRadius: 0 }}>
      {formContent}
    </Paper>
  );
}

export default LoginForm;
