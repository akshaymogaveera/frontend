import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Skeleton,
  Avatar,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { timeOnly, formatDateTime } from '../utils/timezone.js';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import Navbar from '../components/Navbar.js';

const API_BASE = '/api';

const orgTypeColors = {
  restaurant: '#e67e22',
  clinic: '#27ae60',
  company: '#2980b9',
  hospital: '#e74c3c',
  default: '#8e44ad',
};

const orgTypeIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'restaurant') return '🍽️';
  if (t === 'clinic' || t === 'hospital') return '🏥';
  if (t === 'company') return '🏢';
  return '🏪';
};

function OrgCard({ org, onClick }) {
  const color = orgTypeColors[org.type] || orgTypeColors.default;
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 0.5 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                fontSize: 22,
                background: `${color}22`,
                border: `2px solid ${color}44`,
              }}
            >
              {orgTypeIcon(org.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {org.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                <LocationOnOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[org.city, org.state, org.country].filter(Boolean).join(', ')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {org.type && (
              <Chip
                label={org.type}
                size="small"
                sx={{
                  background: `${color}18`,
                  color: color,
                  fontWeight: 600,
                  fontSize: 11,
                  height: 22,
                  borderRadius: 1,
                }}
              />
            )}
            <Chip
              label={org.status}
              size="small"
              color={org.status === 'active' ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontSize: 11, height: 22, borderRadius: 1 }}
            />
            {org.portfolio_site && (
              <Chip
                component="a"
                href={org.portfolio_site}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                label="🌐 Website"
                size="small"
                clickable
                variant="outlined"
                sx={{ fontSize: 11, height: 22, borderRadius: 1 }}
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function CategoryCard({ category, onClick }) {
  const isScheduled = category.is_scheduled;
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: isScheduled
                  ? 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)'
                  : 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 100%)',
                fontSize: 18,
              }}
            >
              <CategoryOutlinedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {category.name || category.description || `Category #${category.id}`}
              </Typography>
              {category.name && category.description && (
                <Typography variant="caption" color="text.secondary">
                  {category.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip
              label={isScheduled ? '📅 Scheduled' : '🚶 Walk-in'}
              size="small"
              sx={{
                fontSize: 11,
                height: 22,
                fontWeight: 600,
                bgcolor: isScheduled ? '#e3f2fd' : '#f3e5f5',
                color: isScheduled ? '#1565c0' : '#6a1b9a',
              }}
            />
            {category.type && (
              <Chip label={category.type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
            )}
            {/* Show scheduling-related details only for scheduled categories */}
            {category.is_scheduled && category.estimated_time && (
              <Chip
                label={`~${category.estimated_time} min`}
                size="small"
                sx={{ fontSize: 11, height: 22, bgcolor: '#fff8e1', color: '#f57f17' }}
              />
            )}
            {category.is_scheduled && category.time_interval_per_appointment && (
              <Chip
                label={`${category.time_interval_per_appointment} min slots`}
                size="small"
                sx={{ fontSize: 11, height: 22, bgcolor: '#e8f5e9', color: '#2e7d32' }}
              />
            )}
            {category.is_scheduled && category.max_advance_days && (
              <Chip
                label={`Up to ${category.max_advance_days}d ahead`}
                size="small"
                sx={{ fontSize: 11, height: 22, bgcolor: '#f5f5f5', color: '#616161' }}
              />
            )}
            <Chip
              label={category.status}
              size="small"
              color={category.status === 'active' ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontSize: 11, height: 22 }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [orgs, setOrgs] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [catError, setCatError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Scheduled appointment state
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduledBookingStatus, setScheduledBookingStatus] = useState(null);
  const [scheduledBookingResult, setScheduledBookingResult] = useState(null);
  const [scheduledBookingError, setScheduledBookingError] = useState('');

  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleSearch = useCallback(async (q = query) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError('');
    setOrgs([]);
    try {
      const res = await fetch(`${API_BASE}/organizations/active/?search=${encodeURIComponent(q)}&page_size=20`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.results || []);
        if ((data.results || []).length === 0) setSearchError('No organizations found. Try a different search.');
      } else if (res.status === 401) {
        localStorage.clear();
        navigate('/');
      } else {
        setSearchError('Failed to fetch organizations.');
      }
    } catch {
      setSearchError('Network error. Please try again.');
    }
    setSearching(false);
  }, [query, token, navigate]);

  const handleSelectOrg = async (org) => {
    setSelectedOrg(org);
    setStep('categories');
    setCategories([]);
    setCatError('');
    setLoadingCats(true);
    try {
      const res = await fetch(`${API_BASE}/categories/active/?organization=${org.id}&page_size=50`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.results || []);
        if ((data.results || []).length === 0) setCatError('No active categories found for this organization.');
      } else {
        setCatError('Failed to load categories.');
      }
    } catch {
      setCatError('Network error. Please try again.');
    }
    setLoadingCats(false);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setBookingStatus(null);
    setBookingResult(null);
    setBookingError('');
    if (cat.is_scheduled) {
      // Open scheduled booking dialog
      setSelectedDate('');
      setSlots([]);
      setSlotsError('');
      setSelectedSlot(null);
      setScheduledBookingStatus(null);
      setScheduledBookingResult(null);
      setScheduledBookingError('');
      setScheduledOpen(true);
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirmBooking = async () => {
    setBookingStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/appointments/unschedule/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          organization: selectedOrg.id,
          category: selectedCategory.id,
          user: parseInt(userId, 10),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookingResult(data);
        setBookingStatus('success');
      } else {
        const err = await res.json();
        setBookingError(err.detail || err.non_field_errors?.[0] || JSON.stringify(err) || 'Booking failed.');
        setBookingStatus('error');
      }
    } catch {
      setBookingError('Network error. Please try again.');
      setBookingStatus('error');
    }
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    if (bookingStatus === 'success') {
      setStep('search');
      setQuery('');
      setOrgs([]);
      setSelectedOrg(null);
      setCategories([]);
      setSelectedCategory(null);
    }
  };

  const resetToSearch = () => {
    setStep('search');
    setSelectedOrg(null);
    setCategories([]);
    setSelectedCategory(null);
    setCatError('');
  };

  // ── Scheduled appointment helpers ────────────────────────────────────────
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (selectedCategory?.max_advance_days || 7));
    return d.toISOString().split('T')[0];
  })();

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDateChange = useCallback(async (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (!dateStr || !selectedCategory) return;
    setLoadingSlots(true);
    setSlotsError('');
    setSlots([]);
    try {
      const res = await fetch(
        `${API_BASE}/appointments/availability/?date=${dateStr}&category_id=${selectedCategory.id}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        // API returns { date, slots: [[ [start, end], available ], ...] }
        const rawSlots = Array.isArray(data) ? data : (data.slots || []);
        // Normalize to [ [isoStart, available], ... ]
        const normalized = rawSlots.map((entry) => {
          const timeRange = entry[0];   // ["09:00", "09:30"]
          const available = entry[1];   // true/false
          const startTime = Array.isArray(timeRange) ? timeRange[0] : timeRange;
          // Build a full ISO datetime string by combining date + start time
          const isoStart = `${dateStr}T${startTime}:00`;
          return [isoStart, available];
        });
        setSlots(normalized);
        if (normalized.length === 0)
          setSlotsError('No available slots for this date.');
      } else {
        setSlotsError('Could not load availability.');
      }
    } catch {
      setSlotsError('Network error loading slots.');
    }
    setLoadingSlots(false);
  }, [selectedCategory, token]);

  const handleScheduledBooking = async () => {
    if (!selectedSlot) return;
    setScheduledBookingStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/appointments/schedule/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          organization: selectedOrg.id,
          category: selectedCategory.id,
          user: parseInt(userId, 10),
          scheduled_time: selectedSlot,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledBookingResult(data);
        setScheduledBookingStatus('success');
      } else {
        const err = await res.json();
        setScheduledBookingError(
          err.detail || err.non_field_errors?.[0] || JSON.stringify(err) || 'Booking failed.'
        );
        setScheduledBookingStatus('error');
      }
    } catch {
      setScheduledBookingError('Network error. Please try again.');
      setScheduledBookingStatus('error');
    }
  };

  const handleCloseScheduled = () => {
    setScheduledOpen(false);
    if (scheduledBookingStatus === 'success') {
      setStep('search');
      setQuery('');
      setOrgs([]);
      setSelectedOrg(null);
      setCategories([]);
      setSelectedCategory(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
        {/* Hero */}
        <Fade in timeout={400}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                background: 'linear-gradient(90deg, #833ab4 0%, #fd1d1d 60%, #fcb045 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              Find your queue
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Search for an organization, pick a service, and join instantly.
            </Typography>
          </Box>
        </Fade>

        {/* Breadcrumb */}
        {step !== 'search' && (
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
            <Link
              underline="hover"
              color="inherit"
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
              onClick={resetToSearch}
            >
              <SearchIcon sx={{ fontSize: 15 }} /> Search
            </Link>
            {selectedOrg && (
              <Typography color="primary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessOutlinedIcon sx={{ fontSize: 15 }} />
                {selectedOrg.name}
              </Typography>
            )}
          </Breadcrumbs>
        )}

        {/* STEP 1: Search */}
        {step === 'search' && (
          <Fade in timeout={300}>
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 4, maxWidth: 620, mx: 'auto' }}>
                <TextField
                  fullWidth
                  placeholder="Search by name, city, type…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: query && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => { setQuery(''); setOrgs([]); setSearchError(''); }}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 3, bgcolor: 'background.paper' },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => handleSearch()}
                  disabled={searching || !query.trim()}
                  sx={{
                    minWidth: 110,
                    borderRadius: 3,
                    px: 3,
                    background: 'linear-gradient(45deg, #833ab4 0%, #fd1d1d 100%)',
                    '&:hover': { background: 'linear-gradient(45deg, #6a2d9f 0%, #c40000 100%)' },
                  }}
                >
                  {searching ? <CircularProgress size={20} color="inherit" /> : 'Search'}
                </Button>
              </Box>

              {searchError && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2, maxWidth: 620, mx: 'auto' }}>
                  {searchError}
                </Alert>
              )}

              {searching && (
                <Grid container spacing={2}>
                  {[...Array(6)].map((_, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton width="70%" height={22} />
                              <Skeleton width="50%" height={16} />
                            </Box>
                          </Box>
                          <Skeleton width="40%" height={22} sx={{ mt: 1.5 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {!searching && orgs.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <BusinessOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary">
                      {orgs.length} organization{orgs.length !== 1 ? 's' : ''} found
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {orgs.map((org) => (
                      <Grid item xs={12} sm={6} md={4} key={org.id}>
                        <OrgCard org={org} onClick={() => handleSelectOrg(org)} />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {!searching && orgs.length === 0 && !searchError && (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <SearchIcon sx={{ fontSize: 64, opacity: 0.15, mb: 1 }} />
                  <Typography variant="h6" fontWeight={600} color="text.secondary">
                    Search for an organization
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                    Type a name, city, or type to get started
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        )}

        {/* STEP 2: Categories */}
        {step === 'categories' && (
          <Fade in timeout={300}>
            <Box>
              <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 100%)' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton
                    onClick={resetToSearch}
                    size="small"
                    sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                  >
                    <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Avatar sx={{ width: 48, height: 48, fontSize: 22, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    {orgTypeIcon(selectedOrg?.type)}
                  </Avatar>
                  <Box sx={{ color: 'white' }}>
                    <Typography variant="h6" fontWeight={700}>{selectedOrg?.name}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.3 }} />
                      {[selectedOrg?.city, selectedOrg?.state, selectedOrg?.country].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Select a service
              </Typography>

              {loadingCats && (
                <Grid container spacing={2}>
                  {[...Array(4)].map((_, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Skeleton variant="circular" width={44} height={44} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton width="60%" height={22} />
                              <Skeleton width="40%" height={16} />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {catError && <Alert severity="info" sx={{ borderRadius: 2 }}>{catError}</Alert>}

              {!loadingCats && categories.length > 0 && (
                <Grid container spacing={2}>
                  {categories.map((cat) => (
                    <Grid item xs={12} sm={6} key={cat.id}>
                      <CategoryCard category={cat} onClick={() => handleSelectCategory(cat)} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Fade>
        )}
      </Box>

      {/* ── Scheduled Booking Dialog ─────────────────────────────────────── */}
      <Dialog
        open={scheduledOpen}
        onClose={scheduledBookingStatus !== 'loading' ? handleCloseScheduled : undefined}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)' }} />
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
          {scheduledBookingStatus === 'success' ? 'Appointment Booked! 🎉' : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayOutlinedIcon sx={{ color: '#833ab4' }} />
              Schedule an Appointment
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {scheduledBookingStatus === 'success' && scheduledBookingResult ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Your appointment is confirmed
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, p: 2, mt: 1, textAlign: 'left' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Scheduled time:</strong>{' '}
                    {scheduledBookingResult?.scheduled_time_display
                      ? formatDateTime(scheduledBookingResult.scheduled_time_display)
                      : scheduledBookingResult?.scheduled_time_with_category_tz
                      ? formatDateTime(scheduledBookingResult.scheduled_time_with_category_tz)
                      : (selectedSlot ? formatDateTime(selectedSlot) : '-')}
                  </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {scheduledBookingResult.status ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Appointment ID:</strong> {scheduledBookingResult.id ? `#${scheduledBookingResult.id}` : '-'}
                </Typography>
              </Box>
            </Box>
          ) : scheduledBookingStatus === 'loading' ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress sx={{ mb: 1 }} />
              <Typography color="text.secondary">Booking your appointment…</Typography>
            </Box>
          ) : (
            <Box>
              {/* Category info */}
              <Box sx={{ bgcolor: 'rgba(131,58,180,0.05)', border: '1px solid rgba(131,58,180,0.15)', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  {selectedOrg?.name} — {selectedCategory?.name || selectedCategory?.description}
                </Typography>
                {selectedCategory?.time_zone && (
                  <Typography variant="caption" color="text.secondary">
                    Timezone: {selectedCategory.time_zone}
                  </Typography>
                )}
              </Box>

              {/* Date picker */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                1. Pick a date
              </Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                inputProps={{ min: todayStr, max: maxDate }}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                sx={{ mb: 3 }}
                InputLabelProps={{ shrink: true }}
                label="Date"
              />

              {/* Slots grid */}
              {selectedDate && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    2. Pick a time slot
                  </Typography>

                  {loadingSlots && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} variant="rounded" width={90} height={36} sx={{ borderRadius: 2 }} />
                      ))}
                    </Box>
                  )}

                  {slotsError && !loadingSlots && (
                    <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>{slotsError}</Alert>
                  )}

                  {!loadingSlots && slots.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {slots.map(([time, available]) => {
                        const isSelected = selectedSlot === time;
                        return (
                          <Tooltip
                            key={time}
                            title={available ? 'Available — click to select' : 'Already booked'}
                          >
                            <span>
                              <Button
                                size="small"
                                variant={isSelected ? 'contained' : 'outlined'}
                                disabled={!available}
                                onClick={() => setSelectedSlot(isSelected ? null : time)}
                                startIcon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
                                sx={{
                                  borderRadius: 2,
                                  fontSize: 12,
                                  px: 1.5,
                                  minWidth: 90,
                                  borderColor: available ? '#2e7d32' : '#ef9a9a',
                                  color: isSelected
                                    ? '#fff'
                                    : available
                                    ? '#2e7d32'
                                    : '#c62828',
                                  bgcolor: isSelected
                                    ? '#2e7d32'
                                    : available
                                    ? '#e8f5e9'
                                    : '#fce4ec',
                                  '&:hover': {
                                    bgcolor: available && !isSelected ? '#c8e6c9' : undefined,
                                  },
                                  '&.Mui-disabled': {
                                    color: '#c62828',
                                    bgcolor: '#fce4ec',
                                    borderColor: '#ef9a9a',
                                    opacity: 0.7,
                                  },
                                }}
                              >
                                {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  )}

                  {/* Legend */}
                  {!loadingSlots && slots.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />
                        <Typography variant="caption" color="text.secondary">Available</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ef9a9a' }} />
                        <Typography variant="caption" color="text.secondary">Occupied</Typography>
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {scheduledBookingStatus === 'error' && (
                <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>{scheduledBookingError}</Alert>
              )}

              {/* Selected slot summary */}
              {selectedSlot && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(131,58,180,0.06)', border: '1px solid rgba(131,58,180,0.2)', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600} color="primary.dark">
                    Selected: {scheduledBookingResult?.scheduled_time_display
                      ? formatDateTime(scheduledBookingResult.scheduled_time_display)
                      : scheduledBookingResult?.scheduled_time_with_category_tz
                      ? formatDateTime(scheduledBookingResult.scheduled_time_with_category_tz)
                      : formatDateTime(selectedSlot)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          {scheduledBookingStatus === 'success' ? (
            <>
              <Button onClick={handleCloseScheduled} variant="outlined" sx={{ borderRadius: 2 }}>
                Book Another
              </Button>
              <Button
                variant="contained"
                startIcon={<EventAvailableOutlinedIcon />}
                onClick={() => { handleCloseScheduled(); navigate('/appointments'); }}
                sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #833ab4, #fd1d1d)', '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' } }}
              >
                View Appointments
              </Button>
            </>
          ) : scheduledBookingStatus !== 'loading' ? (
            <>
              <Button onClick={handleCloseScheduled} variant="outlined" sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={!selectedSlot}
                onClick={handleScheduledBooking}
                sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #833ab4, #fd1d1d)', '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' } }}
              >
                Confirm Booking
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog (walk-in) */}
      <Dialog
        open={confirmOpen}
        onClose={bookingStatus !== 'loading' ? handleCloseConfirm : undefined}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)' }} />
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
          {bookingStatus === 'success' ? 'Booking Confirmed! 🎉' : 'Confirm Appointment'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {bookingStatus === null && selectedOrg && selectedCategory && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                You're about to join the queue for:
              </Typography>
              <Box sx={{ bgcolor: 'rgba(131,58,180,0.05)', border: '1px solid rgba(131,58,180,0.15)', borderRadius: 2, p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessOutlinedIcon color="primary" sx={{ fontSize: 18 }} />
                  <Typography fontWeight={700}>{selectedOrg.name}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryOutlinedIcon color="secondary" sx={{ fontSize: 18 }} />
                  <Typography variant="body2">
                    {selectedCategory.name || selectedCategory.description || `Category #${selectedCategory.id}`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.disabled">
                This is an unscheduled (walk-in) appointment.
              </Typography>
            </Box>
          )}
          {bookingStatus === 'loading' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress sx={{ mb: 1 }} />
              <Typography color="text.secondary">Booking your spot…</Typography>
            </Box>
          )}
          {bookingStatus === 'success' && bookingResult && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                You're #{bookingResult.counter} in line
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, p: 2, mt: 1, textAlign: 'left' }}>
                <Typography variant="body2" color="text.secondary"><strong>Queue position:</strong> #{bookingResult.counter}</Typography>
                <Typography variant="body2" color="text.secondary"><strong>Status:</strong> {bookingResult.status ?? '-'}</Typography>
                <Typography variant="body2" color="text.secondary"><strong>Appointment ID:</strong> {bookingResult.id ? `#${bookingResult.id}` : '-'}</Typography>
                {bookingResult.estimated_time && (
                  <Typography variant="body2" color="text.secondary"><strong>Estimated wait:</strong> {bookingResult.estimated_time}</Typography>
                )}
              </Box>
            </Box>
          )}
          {bookingStatus === 'error' && (
            <Alert severity="error" sx={{ borderRadius: 2, mt: 1 }}>{bookingError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          {bookingStatus === null && (
            <>
              <Button onClick={handleCloseConfirm} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleConfirmBooking}
                sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #833ab4, #fd1d1d)', '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' } }}
              >
                Confirm &amp; Join Queue
              </Button>
            </>
          )}
          {bookingStatus === 'error' && (
            <>
              <Button onClick={handleCloseConfirm} variant="outlined" sx={{ borderRadius: 2 }}>Close</Button>
              <Button variant="contained" onClick={handleConfirmBooking} sx={{ borderRadius: 2 }}>Retry</Button>
            </>
          )}
          {bookingStatus === 'success' && (
            <>
              <Button onClick={handleCloseConfirm} variant="outlined" sx={{ borderRadius: 2 }}>Book Another</Button>
              <Button
                variant="contained"
                startIcon={<EventAvailableOutlinedIcon />}
                onClick={() => { handleCloseConfirm(); navigate('/appointments'); }}
                sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #833ab4, #fd1d1d)', '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' } }}
              >
                View Appointments
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
