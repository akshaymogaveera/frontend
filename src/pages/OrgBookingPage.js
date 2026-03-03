/**
 * OrgBookingPage — direct landing page for a specific organisation.
 *
 * Reached via /org/:orgId (e.g. shared as a QR code link).
 * Loads org details + active categories via the public landing endpoint
 * GET /api/organizations/<orgId>/landing/  (no auth required).
 *
 * When the user books, they are redirected to /login if not authenticated,
 * with a returnUrl so they come back here after signing in.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fade,
  Divider,
  Stack,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';

const API_BASE = '/api';

/* ─── Small helpers ──────────────────────────────────────────────────────── */

function typeColor(type) {
  const map = { clinic: '#0288d1', salon: '#d81b60', restaurant: '#f57c00', gym: '#388e3c', spa: '#7b1fa2' };
  return map[(type || '').toLowerCase()] || '#5c6bc0';
}

function CategoryCard({ cat, onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isScheduled = cat.is_scheduled;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'box-shadow 0.18s, transform 0.15s',
        '&:hover': { boxShadow: '0 8px 28px rgba(131,58,180,0.14)', transform: 'translateY(-2px)' },
      }}
    >
      <CardActionArea onClick={() => onSelect(cat)} sx={{ p: 0 }}>
        <Box
          sx={{
            height: 5,
            background: isScheduled
              ? 'linear-gradient(90deg, #1565c0, #42a5f5)'
              : 'linear-gradient(90deg, #833ab4, #fd1d1d)',
          }}
        />
        <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: isScheduled
                  ? 'linear-gradient(135deg, #1565c0, #42a5f5)'
                  : 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                flexShrink: 0,
              }}
            >
              {isScheduled ? <EventNoteIcon sx={{ fontSize: 20 }} /> : <DirectionsWalkIcon sx={{ fontSize: 20 }} />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {cat.name || cat.description}
              </Typography>
              {cat.description && cat.description !== cat.name && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {cat.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                <Chip
                  label={isScheduled ? '📅 Scheduled' : '🚶 Walk-in'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: isScheduled ? '#e3f2fd' : '#f3e5f5',
                    color: isScheduled ? '#1565c0' : '#6a1b9a',
                  }}
                />
                {cat.estimated_time && (
                  <Chip
                    label={`~${cat.estimated_time} min`}
                    size="small"
                    sx={{ height: 20, fontSize: 11, bgcolor: '#fff8e1', color: '#f57f17' }}
                  />
                )}
                {isScheduled && cat.time_interval_per_appointment && (
                  <Chip
                    label={`${cat.time_interval_per_appointment} min slots`}
                    size="small"
                    sx={{ height: 20, fontSize: 11, bgcolor: '#e8f5e9', color: '#2e7d32' }}
                  />
                )}
                {isScheduled && cat.max_advance_days && (
                  <Chip
                    label={`Book up to ${cat.max_advance_days}d ahead`}
                    size="small"
                    sx={{ height: 20, fontSize: 11, bgcolor: '#f5f5f5', color: '#616161' }}
                  />
                )}
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/* ─── Walk-in booking dialog ─────────────────────────────────────────────── */
function WalkInDialog({ open, onClose, category, orgId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('accessToken');

  const handleBook = async () => {
    setLoading(true);
    setError('');
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${API_BASE}/appointments/unschedule/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: orgId, category: category.id, user: Number(userId) }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        // Normalize error into a readable string to avoid rendering objects directly
        let errorMsg = 'Booking failed. Please try again.';
        if (data.detail) errorMsg = data.detail;
        else if (data.errors) {
          if (typeof data.errors === 'string') errorMsg = data.errors;
          else {
            // pick the first message from the first key
            const first = Object.values(data.errors)[0];
            if (Array.isArray(first)) errorMsg = first[0];
            else if (typeof first === 'string') errorMsg = first;
            else errorMsg = JSON.stringify(data.errors);
          }
        }
        setError(errorMsg);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
    >
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d)' }} />
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Join Walk-in Queue
        <IconButton size="small" onClick={() => !loading && onClose()} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          You are joining the walk-in queue for <strong>{category?.name || category?.description}</strong>.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        {(() => {
          // If the API reported that the appointment already exists, hide the Confirm button
          const isAlreadyExists = error && /already exists/i.test(error);
          if (isAlreadyExists) return null;
          return (
            <Button
              onClick={handleBook}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(45deg, #833ab4, #fd1d1d)',
                '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' },
              }}
            >
              {loading ? 'Booking…' : 'Confirm'}
            </Button>
          );
        })()}
      </DialogActions>
    </Dialog>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function OrgBookingPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [org, setOrg] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [bookSuccess, setBookSuccess] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

  const fetchLanding = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/landing/`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data.organization);
        setCategories(data.categories || []);
      } else if (res.status === 404) {
        setError('Organisation not found or is not active.');
      } else {
        setError('Failed to load organisation details.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    // Call fetchLanding in an async IIFE to avoid synchronous setState inside
    // the effect body (prevents cascading renders and satisfies the linter).
    (async () => {
      await fetchLanding();
    })();
  }, [fetchLanding]);

  const handleCategorySelect = (cat) => {
    if (!isLoggedIn) {
      // Save returnUrl so the login page bounces back here
      localStorage.setItem('returnUrl', `/org/${orgId}`);
      navigate('/');
      return;
    }
    if (cat.is_scheduled) {
      // For scheduled categories, go to HomePage with category pre-selected
      // Pass the org and category objects in location.state so Home can
      // immediately open the slot picker without an extra fetch.
      navigate('/home', { state: { preSelectOrg: org, preSelectCat: cat } });
    } else {
      setSelectedCat(cat);
    }
  };

  const handleBookSuccess = () => {
    setSelectedCat(null);
    setBookSuccess(true);
    setTimeout(() => navigate('/appointments'), 2500);
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, maxWidth: 400, width: '100%' }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* ── Hero ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 60%, #fcb045 100%)',
          color: '#fff',
          pt: isMobile ? 4 : 5,
          pb: isMobile ? 5 : 6,
          px: isMobile ? 2.5 : 4,
          position: 'relative',
        }}
      >
        {/* Back button (only if came from somewhere — show always for UX) */}
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(isLoggedIn ? '/home' : '/')}
          sx={{ color: 'rgba(255,255,255,0.75)', mb: 2, textTransform: 'none', fontWeight: 500 }}
        >
          {isLoggedIn ? 'Home' : 'Sign In'}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <BusinessOutlinedIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2 }}>
              {org?.name}
            </Typography>
            {org?.type && (
              <Chip
                label={org.type}
                size="small"
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: 'rgba(255,255,255,0.22)',
                  color: '#fff',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Location */}
        {(org?.city || org?.country) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, opacity: 0.85 }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography variant="body2">
              {[org.city, org.state, org.country].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}

        {org?.portfolio_site && (
          <Typography
            variant="caption"
            component="a"
            href={org.portfolio_site}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.75)', textDecoration: 'underline' }}
          >
            {org.portfolio_site}
          </Typography>
        )}

        {!isLoggedIn && (
          <Paper
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
              👋 Sign in to book an appointment with this organisation.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* ── Categories ── */}
      <Box
        sx={{
          flex: 1,
          maxWidth: isMobile ? '100%' : 720,
          mx: 'auto',
          width: '100%',
          px: isMobile ? 1.5 : 3,
          py: 3,
        }}
      >
        {bookSuccess && (
          <Fade in>
            <Alert
              severity="success"
              sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
              icon={<CheckCircleOutlineIcon />}
            >
              🎉 You've joined the queue! Redirecting to your appointments…
            </Alert>
          </Fade>
        )}

        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {categories.length === 0 ? 'No services available' : 'Available Services'}
        </Typography>

        {categories.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            This organisation has no active services at the moment.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {categories.map((cat) => (
            <Fade in key={cat.id}>
              <Box>
                <CategoryCard cat={cat} onSelect={handleCategorySelect} />
              </Box>
            </Fade>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center' }}>
          Powered by sqip · Queue Management Made Simple
        </Typography>
      </Box>

      {/* Walk-in booking dialog */}
      {selectedCat && !selectedCat.is_scheduled && (
        <WalkInDialog
          open={Boolean(selectedCat)}
          onClose={() => setSelectedCat(null)}
          category={selectedCat}
          orgId={Number(orgId)}
          onSuccess={handleBookSuccess}
        />
      )}
    </Box>
  );
}
