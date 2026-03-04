import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Fade,
  Divider,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLoginModal } from '../contexts/LoginModalContext.js';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';

const API_BASE = '/api';

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardActionArea onClick={() => onSelect(cat)} sx={{ p: isMobile ? 2 : 2.5, height: '100%', alignItems: 'stretch', display: 'flex' }}>
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 5,
            background: isScheduled ? 'linear-gradient(90deg, #1565c0, #42a5f5)' : 'linear-gradient(90deg, #833ab4, #fd1d1d)',
          }}
        />
        <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1 }}>
            <Avatar sx={{ width: 40, height: 40, background: isScheduled ? 'linear-gradient(135deg, #1565c0, #42a5f5)' : 'linear-gradient(135deg, #833ab4, #fd1d1d)', flexShrink: 0 }}>
              {isScheduled ? <EventNoteIcon sx={{ fontSize: 20 }} /> : <DirectionsWalkIcon sx={{ fontSize: 20 }} />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cat.name || cat.description}
              </Typography>
              {cat.description && cat.description !== cat.name && (
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', mt: 0.5 }}>
                  {cat.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                <Chip label={isScheduled ? '📅 Scheduled' : '🚶 Walk-in'} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: isScheduled ? '#e3f2fd' : '#f3e5f5', color: isScheduled ? '#1565c0' : '#6a1b9a' }} />
                {cat.estimated_time && <Chip label={`~${cat.estimated_time} min`} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#fff8e1', color: '#f57f17' }} />}
                {isScheduled && cat.time_interval_per_appointment && <Chip label={`${cat.time_interval_per_appointment} min slots`} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#e8f5e9', color: '#2e7d32' }} />}
                {isScheduled && cat.max_advance_days && <Chip label={`Book up to ${cat.max_advance_days}d ahead`} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#f5f5f5', color: '#616161' }} />}
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

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
        let errorMsg = 'Booking failed. Please try again.';
        if (data.detail) errorMsg = data.detail;
        else if (data.errors) {
          if (typeof data.errors === 'string') errorMsg = data.errors;
          else {
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
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d)' }} />
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Join Walk-in Queue
        <Button size="small" onClick={() => !loading && onClose()} sx={{ color: 'text.secondary' }} startIcon={<CloseIcon />}>Close</Button>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">You are joining the walk-in queue for <strong>{category?.name || category?.description}</strong>.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button onClick={handleBook} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />} sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #833ab4, #fd1d1d)' }}>{loading ? 'Booking…' : 'Confirm'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OrgBookingPage() {
  const { orgId, categoryId } = useParams();
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
  const { openLogin } = useLoginModal();

  const fetchLanding = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/landing/`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data.organization);
        if (categoryId && data.categories) {
          const cat = data.categories.find((c) => String(c.id) === String(categoryId));
          if (cat) {
            setCategories([cat]);
            const token = localStorage.getItem('accessToken');
            if (token) setSelectedCat(cat);
          } else {
            setCategories(data.categories || []);
          }
        } else {
          setCategories(data.categories || []);
        }
      } else if (res.status === 404) {
        setError('Organisation not found or is not active.');
      } else {
        setError('Failed to load organisation details.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }, [orgId, categoryId]);

  useEffect(() => { (async () => { await fetchLanding(); })(); }, [fetchLanding]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const preOrg = detail.preSelectOrg;
      const preCat = detail.preSelectCat;
      if (preOrg && preCat && String(preOrg.id) === String(orgId)) {
        setSelectedCat(preCat);
        if (preCat.is_scheduled) {
          navigate('/', { state: { preSelectOrg: preOrg, preSelectCat: preCat } });
        } else {
          setSelectedCat(preCat);
        }
      }
    };
    window.addEventListener('sqip:postLogin', handler);
    return () => window.removeEventListener('sqip:postLogin', handler);
  }, [orgId, navigate]);

  const handleCategorySelect = (cat) => {
    if (!isLoggedIn) {
      openLogin({ from: `/org/${orgId}/category/${cat.id}`, preSelectOrg: org, preSelectCat: cat });
      return;
    }
    if (cat.is_scheduled) {
      navigate('/', { state: { preSelectOrg: org, preSelectCat: cat } });
    } else {
      setSelectedCat(cat);
    }
  };

  const handleBookSuccess = () => {
    setSelectedCat(null);
    setBookSuccess(true);
    setTimeout(() => navigate('/appointments'), 2500);
  };

  if (loading) return (<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>);
  if (error) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" sx={{ mb: 2, borderRadius: 2, maxWidth: 400, width: '100%' }}>{error}</Alert>
      <Button variant="outlined" onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>Go to Login</Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 60%, #fcb045 100%)', color: '#fff', pt: isMobile ? 4 : 5, pb: isMobile ? 5 : 6, px: isMobile ? 2.5 : 4, position: 'relative' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(isLoggedIn ? '/home' : '/')} sx={{ color: 'rgba(255,255,255,0.75)', mb: 2, textTransform: 'none', fontWeight: 500 }}>{isLoggedIn ? 'Home' : 'Sign In'}</Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: 800 }}><BusinessOutlinedIcon sx={{ fontSize: 28 }} /></Avatar>
          <Box>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2 }}>{org?.name}</Typography>
            {org?.type && <Chip label={org.type} size="small" sx={{ mt: 0.5, height: 20, fontSize: 11, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' }} />}
          </Box>
        </Box>
        {(org?.city || org?.country) && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, opacity: 0.85 }}><LocationOnOutlinedIcon sx={{ fontSize: 15 }} /><Typography variant="body2">{[org.city, org.state, org.country].filter(Boolean).join(', ')}</Typography></Box>)}
        {org?.portfolio_site && (<Typography variant="caption" component="a" href={org.portfolio_site} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.75)', textDecoration: 'underline' }}>{org.portfolio_site}</Typography>)}
        {!isLoggedIn && (<Paper sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}><Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>👋 Sign in to book an appointment with this organisation.</Typography></Paper>)}
      </Box>

      <Box sx={{ flex: 1, maxWidth: isMobile ? '100%' : 720, mx: 'auto', width: '100%', px: isMobile ? 1.5 : 3, py: 3 }}>
        {bookSuccess && (<Fade in><Alert severity="success" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }} icon={<CheckCircleOutlineIcon />}>🎉 You've joined the queue! Redirecting to your appointments…</Alert></Fade>)}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{categories.length === 0 ? 'No services available' : 'Available Services'}</Typography>
        {categories.length === 0 && (<Typography variant="body2" color="text.secondary">This organisation has no active services at the moment.</Typography>)}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {categories.map((cat) => (<Fade in key={cat.id}><Box sx={{ height: '100%' }}><CategoryCard cat={cat} onSelect={handleCategorySelect} /></Box></Fade>))}
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center' }}>Powered by sqip · Queue Management Made Simple</Typography>
      </Box>

      {selectedCat && !selectedCat.is_scheduled && (<WalkInDialog open={Boolean(selectedCat)} onClose={() => setSelectedCat(null)} category={selectedCat} orgId={Number(orgId)} onSuccess={handleBookSuccess} />)}
    </Box>
  );
}
