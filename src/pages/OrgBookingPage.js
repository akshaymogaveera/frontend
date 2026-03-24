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
  Tooltip,
  Collapse,
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
import MapIcon from '@mui/icons-material/Map';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AddIcon from '@mui/icons-material/Add';
import BookingConfirmDialog from '../components/BookingConfirmDialog.js';
import SchedulerDialog from '../components/SchedulerDialog.js';

const API_BASE = '/api';

/** Format total minutes into a human-readable string, e.g. 90 → "1 hr 30 min" */
function formatWaitMinutes(totalMins) {
  if (!totalMins || totalMins <= 0) return null;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/** Build a Google Maps search URL from address parts */
function mapsUrl(org) {
  const parts = [
    org?.address_line1,
    org?.address_line2,
    org?.pincode,
    org?.city,
    org?.state,
    org?.country,
  ].filter(Boolean);
  if (!parts.length) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
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
              {/* Address & phone — shown when populated */}
              {(cat.address_line1 || cat.phone_number) && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  {cat.address_line1 && (
                    <Box
                      component="a"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([cat.address_line1, cat.address_line2, cat.pincode].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e53935', color: '#fff', borderRadius: '6px', width: 22, height: 22, flexShrink: 0 }}>
                        <MapIcon sx={{ fontSize: 14 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[cat.address_line1, cat.pincode].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                  )}
                  {cat.phone_number && (
                    <Box
                      component="a"
                      href={`tel:${cat.phone_number}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.4, textDecoration: 'none' }}
                    >
                      <LocalPhoneOutlinedIcon sx={{ fontSize: 13, color: 'success.main' }} />
                      <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600 }}>{cat.phone_number}</Typography>
                    </Box>
                  )}
                </Box>
              )}
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
  const [userNote, setUserNote] = useState('');
  const [noteExpanded, setNoteExpanded] = useState(false);

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
        // If user left a note, post it silently (best-effort, don't block success)
        if (userNote.trim() && data?.id) {
          fetch(`${API_BASE}/appointments/${data.id}/notes/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: userNote.trim() }),
          }).catch(() => {});
        }
        setUserNote('');
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

  // Reset note when dialog closes
  useEffect(() => {
    if (!open) (async () => { setUserNote(''); })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
      <Box sx={{ height: 4, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)' }} />
      <DialogTitle sx={{ fontWeight: 700, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Join Walk-in Queue
        <Button size="small" onClick={() => !loading && onClose()} sx={{ color: 'text.secondary' }} startIcon={<CloseIcon />}>Close</Button>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>You're about to join the queue.</Typography>
        
        {preview && preview.count > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,152,0,0.08)', borderRadius: 2, border: '1px solid rgba(255,152,0,0.2)' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {`There ${preview.count === 1 ? 'is' : 'are'} ${preview.count} ${preview.count === 1 ? 'person' : 'people'} waiting.`}
            </Typography>
            <Typography variant="caption" color="text.secondary">You'll be added after them.</Typography>
            {category?.estimated_time > 0 && (() => {
              const waitStr = formatWaitMinutes(preview.count * category.estimated_time);
              return waitStr ? (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: 'warning.main' }}>
                  ⏱ Estimated wait: ~{waitStr}
                </Typography>
              ) : null;
            })()}
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You are joining the walk-in queue for <strong>{category?.name || category?.description}</strong>.
        </Typography>
        
        {/* Collapsible Add Note Section */}
        <Box sx={{ mb: 1.5 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setNoteExpanded(!noteExpanded)}
            variant="text"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, mb: 1 }}
          >
            Add Note (Optional)
          </Button>
          <Collapse in={noteExpanded}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder="Note for the staff"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value.slice(0, 1000))}
              inputProps={{ maxLength: 1000 }}
              helperText={`${userNote.length}/1000`}
              FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
            />
          </Collapse>
        </Box>
        
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>Cancel</Button>
        {!(error && /already exist/i.test(error)) && (
          <Button onClick={handleBook} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2 }}>
            {loading ? 'Booking…' : 'Confirm'}
          </Button>
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
    // appt is the created appointment object returned by the API.
    // Do NOT close the SchedulerDialog here — it shows its own success screen.
    // The BookingConfirmDialog will open when the user explicitly closes the scheduler.
    setCreatedAppt(appt || null);
  };

  const handleBookError = (errorMsg) => {
    // close the selection and show the shared booking dialog in error mode
    setSelectedCat(null);
    setCreatedAppt(null);
    setCreatedApptError(errorMsg || 'Booking failed.');
    setCreatedApptErrorOpen(true);
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
      {/* Hero banner */}
      <Box sx={{
        background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
        color: '#fff',
        pt: isMobile ? 2.5 : 4,
        pb: isMobile ? 3 : 4,
        px: isMobile ? 2.5 : 4,
        position: 'relative',
      }}>
        {/* Top nav row — back button left, login button right when not signed in */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {isLoggedIn ? (
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')} sx={{ color: 'rgba(255,255,255,0.75)', textTransform: 'none', fontWeight: 500 }}>Home</Button>
          ) : (
            <Box />
          )}
          {!isLoggedIn && (
            <Button
              size="small"
              variant="contained"
              onClick={() => openLogin({ from: window.location.pathname + window.location.search })}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 2, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
            >
              Sign In
            </Button>
          )}
        </Box>

        {/* Avatar centered */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Avatar
            src={org?.display_picture_url || undefined}
            sx={{
              width: { xs: 64, sm: 72 },
              height: { xs: 64, sm: 72 },
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: 28,
              fontWeight: 800,
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}
          >
            {!org?.display_picture_url && <BusinessOutlinedIcon sx={{ fontSize: 30 }} />}
          </Avatar>
        </Box>

        {/* Org name */}
        <Typography variant="h5" fontWeight={900} align="center" sx={{ lineHeight: 1.2, mb: 0.5 }}>
          {org?.name}
        </Typography>

        {/* Type chip */}
        {org?.type && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Chip
              label={org.type}
              size="small"
              sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: (theme) => theme.palette.custom?.mint, color: (theme) => theme.palette.custom?.deepSlate }}
            />
          </Box>
        )}

        {/* Address row */}
        {(() => {
          const addrParts = [org?.address_line1, org?.address_line2, org?.pincode, org?.city, org?.state, org?.country].filter(Boolean);
          const url = mapsUrl(org);
          if (!addrParts.length) return null;
          return (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.5, opacity: 0.9, px: { xs: 0.5, sm: 1 } }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 15, mt: '2px', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{addrParts.join(', ')}</Typography>
              {url && (
                <Tooltip title="Open in Google Maps">
                  <Box
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ml: 0.5,
                      flexShrink: 0,
                      bgcolor: '#e53935',
                      color: '#fff',
                      borderRadius: '8px',
                      width: 30,
                      height: 30,
                      boxShadow: '0 2px 8px rgba(229,57,53,0.45)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': { bgcolor: '#c62828', transform: 'scale(1.1)', boxShadow: '0 4px 14px rgba(229,57,53,0.55)' },
                    }}
                  >
                    <MapIcon sx={{ fontSize: 17 }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        })()}

        {/* Phone number */}
        {org?.phone_number && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, opacity: 0.9, px: { xs: 0.5, sm: 1 } }}>
            <LocalPhoneOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
            <Typography
              component="a"
              href={`tel:${org.phone_number}`}
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
            >
              {org.phone_number}
            </Typography>
          </Box>
        )}

        {org?.portfolio_site && (
          <Typography variant="caption" component="a" href={org.portfolio_site} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.75)', textDecoration: 'underline', px: { xs: 0.5, sm: 1 } }}>{org.portfolio_site}</Typography>
        )}

        {!isLoggedIn && (
          <Paper
            onClick={() => openLogin({ from: window.location.pathname + window.location.search })}
            sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
          >
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
              👋 Sign in to book an appointment — <Box component="span" sx={{ textDecoration: 'underline', fontWeight: 700 }}>tap here to log in</Box>
            </Typography>
          </Paper>
        )}
      </Box>

      <Box sx={{ flex: 1, maxWidth: isMobile ? '100%' : 720, mx: 'auto', width: '100%', px: isMobile ? 1.5 : 3, py: 3, pb: isMobile ? '20vh' : 3 }}>
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
        <SchedulerDialog
          open={Boolean(selectedCat)}
          onClose={() => setSelectedCat(null)}
          onSuccess={handleBookSuccess}
          org={org}
          category={selectedCat}
          userId={localStorage.getItem('userId')}
          token={localStorage.getItem('accessToken')}
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
