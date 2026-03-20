import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
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
import BookingConfirmDialog from '../components/BookingConfirmDialog.js';

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
            background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
          }}
        />
        <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1 }}>
            <Avatar sx={{ width: 40, height: 40, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)', flexShrink: 0 }}>
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

function WalkInDialog({ open, onClose, category, orgId, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState({ count: 0, items: [] });

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
        // return created appointment object to caller so the page can show a modal
        const data = await res.json();
        onSuccess(data);
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
        // let parent show the shared BookingConfirmDialog in error mode (so it can show View Appointments)
        if (typeof onError === 'function') {
          onError(errorMsg);
        } else {
          setError(errorMsg);
        }
      }
    } catch {
      if (typeof onError === 'function') onError('Network error. Please try again.');
      else setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  // Fetch a small preview of the current unscheduled queue when dialog opens
  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      if (!open || !category) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await fetch(`${API_BASE}/appointments/unscheduled-count/?category_id=${category.id}&status=active`, { headers });
        if (!mounted) return;
        if (r.ok) {
          const d = await r.json();
          setPreview({ count: d.count || 0, items: [] });
        } else {
          setPreview({ count: 0, items: [] });
        }
      } catch (e) {
        if (!mounted) return;
        setPreview({ count: 0, items: [] });
      }
    };
    fetchPreview();
    return () => { mounted = false; };
  }, [open, category]);

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
      <Box sx={{ height: 4, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)' }} />
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Join Walk-in Queue
        <Button size="small" onClick={() => !loading && onClose()} sx={{ color: 'text.secondary' }} startIcon={<CloseIcon />}>Close</Button>
      </DialogTitle>
      <DialogContent>
        {preview && preview.count > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{`There are ${preview.count} people currently waiting.`}</Typography>
            <Typography variant="caption" color="text.secondary">You'll be added after them.</Typography>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">You are joining the walk-in queue for <strong>{category?.name || category?.description}</strong>.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>Cancel</Button>
        {/* If server reports a duplicate appointment error, hide the Confirm button to
            prevent repeated submissions. Use a case-insensitive match for 'already exist'. */}
        {!(error && /already exist/i.test(error)) && (
          <Button onClick={handleBook} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />} sx={{ borderRadius: 2 }}>{loading ? 'Booking…' : 'Confirm'}</Button>
        )}
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
  // removed redirecting success banner; we'll open the booking-confirm dialog instead
  const [createdAppt, setCreatedAppt] = useState(null);
  const [createdApptOpen, setCreatedApptOpen] = useState(false);
  const [createdApptError, setCreatedApptError] = useState(null);
  const [createdApptErrorOpen, setCreatedApptErrorOpen] = useState(false);
  
  // (removed unused cancel handler)

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
            // Only auto-open when explicitly requested via ?open=1 or ?open=true.
            // If the user is not logged in and the URL requested open, trigger the
            // login modal with preselect so the dialog can open after successful login.
            const qs = new URLSearchParams(window.location.search);
            const explicitlyOpen = qs.get('open') === '1' || qs.get('open') === 'true';
            const token = localStorage.getItem('accessToken');
            if (explicitlyOpen) {
              if (token) setSelectedCat(cat);
              else openLogin({ from: window.location.pathname + window.location.search, preSelectOrg: data.organization, preSelectCat: cat });
            }
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
  }, [orgId, categoryId, openLogin]);

  useEffect(() => { (async () => { await fetchLanding(); })(); }, [fetchLanding]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const preOrg = detail.preSelectOrg;
      const preCat = detail.preSelectCat;
      if (preOrg && preCat && String(preOrg.id) === String(orgId)) {
        // Keep the user on the org/category page. For scheduled categories we
        // previously redirected to the home page to reuse the booking dialog.
        // That changes the user's context; instead, stay on this page and mark
        // the category as selected so the UI can open a booking flow here.
        setSelectedCat(preCat);
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
    // Stay on this page for scheduled categories as well; mark the category
    // selected so a scheduling flow can be presented in-place (no redirect).
    setSelectedCat(cat);
  };

  const handleBookSuccess = (appt) => {
    // appt is the created appointment object returned by the API
    setSelectedCat(null);
    setCreatedAppt(appt || null);
    setCreatedApptOpen(true);
  };

  const handleBookError = (errorMsg) => {
    // close the selection and show the shared booking dialog in error mode
    setSelectedCat(null);
    setCreatedAppt(null);
    setCreatedApptError(errorMsg || 'Booking failed.');
    setCreatedApptErrorOpen(true);
  };

  // Lightweight scheduled booking dialog for scheduled categories so users
  // can book without leaving the org/category page.
  function ScheduledDialog({ open, onClose, category, orgId, onSuccess, onError }) {
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
      if (!open) return;
      // default date to today in YYYY-MM-DD
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const today = `${yyyy}-${mm}-${dd}`;
      setDate(today);
      setSelectedSlot(null);
    }, [open]);

    useEffect(() => {
      let mounted = true;
      if (!open || !date || !category) return;
      (async () => {
        setLoadingSlots(true);
        setSlots([]);
        try {
          const res = await fetch(`${API_BASE}/appointments/availability/?date=${date}&category_id=${category.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            const rawSlots = Array.isArray(data) ? data : (data.slots || []);
            const normalized = rawSlots.map((entry) => {
              const timeRange = entry[0];
              const available = entry[1];
              const startTime = Array.isArray(timeRange) ? timeRange[0] : timeRange;
              const isoStart = `${date}T${startTime}:00`;
              return [isoStart, Boolean(available)];
            });
            setSlots(normalized);
          } else {
            setSlots([]);
          }
        } catch (e) {
          setSlots([]);
        }
        setLoadingSlots(false);
      })();
      return () => { mounted = false; };
    }, [open, date, category, token]);

    const handleConfirm = async () => {
      if (!selectedSlot) return;
      setLoading(true);
      setError('');
      try {
        const payload = { organization: Number(orgId), category: category.id, user: Number(userId), scheduled_time: selectedSlot };
        const res = await fetch(`${API_BASE}/appointments/schedule/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          onClose();
          if (onSuccess) onSuccess(data);
        } else {
          const d = await res.json();
          let msg = 'Booking failed.';
          if (d.detail) msg = d.detail;
          else if (d.errors) msg = typeof d.errors === 'string' ? d.errors : JSON.stringify(d.errors);
          setError(msg);
          if (onError) onError(msg);
        }
      } catch (e) {
        setError('Network error.');
        if (onError) onError('Network error.');
      }
      setLoading(false);
    };

    return (
      <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule an Appointment</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={700}>{category?.name}</Typography>
            <Typography variant="caption" color="text.secondary">Pick a date and time</Typography>
          </Box>
          <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth sx={{ mb: 2 }} />
          {loadingSlots ? <CircularProgress /> : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {slots.map(([iso, available]) => (
                <Button key={iso} variant={selectedSlot === iso ? 'contained' : 'outlined'} disabled={!available} onClick={() => setSelectedSlot(iso)} sx={{ borderRadius: 2 }}>{iso.split('T')[1].slice(0,5)}</Button>
              ))}
              {slots.length === 0 && <Typography variant="body2" color="text.secondary">No slots available for this date.</Typography>}
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { onClose(); setSelectedSlot(null); }} variant="outlined" disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={!selectedSlot || loading} startIcon={loading ? <CircularProgress size={16} /> : null}>Confirm</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (loading) return (<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>);
  if (error) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Alert severity="error" sx={{ mb: 2, borderRadius: 2, maxWidth: 400, width: '100%' }}>{error}</Alert>
      <Button variant="outlined" onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>Go to Login</Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
  <Box sx={{ background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)', color: '#fff', pt: isMobile ? 4 : 5, pb: isMobile ? 5 : 6, px: isMobile ? 2.5 : 4, position: 'relative' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(isLoggedIn ? '/home' : '/')} sx={{ color: 'rgba(255,255,255,0.75)', mb: 2, textTransform: 'none', fontWeight: 500 }}>{isLoggedIn ? 'Home' : 'Sign In'}</Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: 800 }}><BusinessOutlinedIcon sx={{ fontSize: 28 }} /></Avatar>
          <Box>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2 }}>{org?.name}</Typography>
            {org?.type && <Chip label={org.type} size="small" sx={{ mt: 0.5, height: 20, fontSize: 11, fontWeight: 600, bgcolor: (theme) => theme.palette.custom.mint, color: (theme) => theme.palette.custom.deepSlate }} />}
          </Box>
        </Box>
        {(org?.city || org?.country) && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, opacity: 0.85 }}><LocationOnOutlinedIcon sx={{ fontSize: 15 }} /><Typography variant="body2">{[org.city, org.state, org.country].filter(Boolean).join(', ')}</Typography></Box>)}
        {org?.portfolio_site && (<Typography variant="caption" component="a" href={org.portfolio_site} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.75)', textDecoration: 'underline' }}>{org.portfolio_site}</Typography>)}
        {!isLoggedIn && (<Paper sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}><Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>👋 Sign in to book an appointment with this organisation.</Typography></Paper>)}
      </Box>

      <Box sx={{ flex: 1, maxWidth: isMobile ? '100%' : 720, mx: 'auto', width: '100%', px: isMobile ? 1.5 : 3, py: 3 }}>
  {/* Removed redirecting banner — booking confirmation dialog will open instead */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{categories.length === 0 ? 'No services available' : 'Available Services'}</Typography>
        {categories.length === 0 && (<Typography variant="body2" color="text.secondary">This organisation has no active services at the moment.</Typography>)}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {categories.map((cat) => (
            <Fade in key={cat.id}>
              <Box sx={{ width: '100%' }}>
                <CategoryCard cat={cat} onSelect={handleCategorySelect} />
              </Box>
            </Fade>
          ))}
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center' }}>Powered by sqip · Queue Management Made Simple</Typography>
      </Box>

      {selectedCat && !selectedCat.is_scheduled && (
        <WalkInDialog
          open={Boolean(selectedCat)}
          onClose={() => setSelectedCat(null)}
          category={selectedCat}
          orgId={Number(orgId)}
          onSuccess={handleBookSuccess}
          onError={handleBookError}
        />
      )}

      {selectedCat && selectedCat.is_scheduled && (
        <ScheduledDialog
          open={Boolean(selectedCat)}
          onClose={() => setSelectedCat(null)}
          category={selectedCat}
          orgId={Number(orgId)}
          onSuccess={handleBookSuccess}
          onError={handleBookError}
        />
      )}

      <BookingConfirmDialog
        open={createdApptOpen || createdApptErrorOpen}
        onClose={() => { setCreatedApptOpen(false); setCreatedApptErrorOpen(false); setCreatedAppt(null); setCreatedApptError(null); }}
        status={createdApptOpen ? 'success' : (createdApptErrorOpen ? 'error' : null)}
        result={createdAppt}
        error={createdApptError}
        onConfirm={null}
        onBookAnother={() => { setCreatedApptOpen(false); setCreatedAppt(null); setCreatedApptError(null); setCreatedApptErrorOpen(false); }}
        onViewAppointments={() => { setCreatedApptOpen(false); setCreatedApptErrorOpen(false); navigate('/appointments'); }}
        onViewAppointment={() => { setCreatedApptOpen(false); setCreatedApptErrorOpen(false); navigate('/appointments', { state: { openApptId: createdAppt?.id } }); }}
      />
    </Box>
  );
}
