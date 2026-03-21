import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useLoginModal } from '../contexts/LoginModalContext.js';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
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
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { timeOnly, formatDateTime, formatDate, formatServerDateTime } from '../utils/timezone.js';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import Navbar from '../components/Navbar.js';
import BookingConfirmDialog from '../components/BookingConfirmDialog.js';
import SchedulerDialog from '../components/SchedulerDialog.js';

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

// Keep a single CategoryCard implementation (below) to avoid duplicate
// declarations which previously caused a Babel parse error. The harmonized
// card uses a flexible column layout, clamped text, and a fixed visual size
// via parent grid/stretch so cards appear identical across pages.

function OrgCard({ org, onClick }) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: (theme) => theme.palette.custom && theme.palette.custom.gradientPrimary,
                fontSize: 18,
              }}
            >
              <BusinessOutlinedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {org.name}
              </Typography>
              {org.type && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {org.type}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {org.city && (
              <Chip
                icon={<LocationOnOutlinedIcon sx={{ fontSize: 12 }} />}
                label={org.city}
                size="small"
                sx={{ fontSize: 11, height: 22, bgcolor: '#f5f5f5', color: '#616161' }}
              />
            )}
            <Chip
              label={org.status || 'active'}
              size="small"
              color={(org.status || 'active') === 'active' ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontSize: 11, height: 22 }}
            />
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
        <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: (theme) => theme.palette.custom && theme.palette.custom.gradientPrimary,
                fontSize: 18,
              }}
            >
              <CategoryOutlinedIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  // Clamp title to two lines to avoid overflow
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {category.name || category.description || `Category #${category.id}`}
              </Typography>
              {category.name && category.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
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
                bgcolor: (theme) => (isScheduled ? theme.palette.custom.mint : 'rgba(45,84,110,0.06)'),
                color: (theme) => (isScheduled ? theme.palette.primary.main : theme.palette.custom.deepSlate),
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
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin } = useLoginModal();
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [orgs, setOrgs] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch (e) { return []; }
  });
  const searchDebounceRef = useRef(null);
  const searchAbortRef = useRef(null);
  const skipDebounceRef = useRef(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [catError, setCatError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPreview, setConfirmPreview] = useState({ count: 0, items: [] });
  // Scheduled appointment state
  const [scheduledOpen, setScheduledOpen] = useState(false);

  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // If navigated from /org/:id we may receive preSelectOrg and preSelectCat
  // in location.state. If present, pre-populate the org/category and open
  // the same booking flow that clicking the card on Home would open.
  const handledRef = useRef(false);

  useEffect(() => {
    // Defer state updates to avoid calling setState synchronously inside the
    // effect body which can trigger the "set-state-in-effect" ESLint rule.
    const state = location?.state || {};
    const preOrg = state.preSelectOrg;
    const preCat = state.preSelectCat;

    if (preOrg && preCat && !handledRef.current) {
      handledRef.current = true;
      (async () => {
        await Promise.resolve();
        try {
          setSelectedOrg(preOrg);
          setStep('categories');

          // Populate categories for the org if we don't already have them.
          // If the component was navigated to via a modal login, the access
          // token should be present in localStorage; use it when available.
          if (!categories || categories.length === 0) {
            try {
              const t = localStorage.getItem('accessToken');
              const hdrs = t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
              const catRes = await fetch(`${API_BASE}/categories/active/?organization=${preOrg.id}&page_size=50`, { headers: hdrs });
              if (catRes.ok) {
                const catData = await catRes.json();
                setCategories(catData.results || []);
              } else {
                // fallback to showing the single pre-selected category
                setCategories([preCat]);
              }
            } catch {
              setCategories([preCat]);
            }
          }

          setSelectedCategory(preCat);
          if (preCat.is_scheduled) {
            setScheduledOpen(true);
          } else {
            setBookingStatus(null);
            setBookingResult(null);
            setBookingError('');
            setConfirmOpen(true);
          }
        } catch (err) {
          // ignore any parsing/navigation issues
        }
      })();
    }
  // Run when location.state changes so modal-based logins can resume flow
  }, [location.state]);

  // Listen for post-login resume events (emitted when login modal succeeds)
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const preOrg = detail.preSelectOrg;
      const preCat = detail.preSelectCat;
      if (preOrg && preCat) {
        (async () => {
          try {
            setSelectedOrg(preOrg);
            setStep('categories');

            // Try to fetch the full category list for the org so the UI
            // shows all services after login/resume instead of only the
            // single clicked category.
            try {
              const t = localStorage.getItem('accessToken');
              const hdrs = t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
              const catRes = await fetch(`${API_BASE}/categories/active/?organization=${preOrg.id}&page_size=50`, { headers: hdrs });
              if (catRes.ok) {
                const catData = await catRes.json();
                setCategories(catData.results || [preCat]);
              } else {
                setCategories([preCat]);
              }
            } catch {
              setCategories([preCat]);
            }

            setSelectedCategory(preCat);
            if (preCat.is_scheduled) {
                    setScheduledOpen(true);
            } else {
              setBookingStatus(null);
              setBookingResult(null);
              setBookingError('');
              setConfirmOpen(true);
            }
          } catch (err) {
            // ignore any parsing/navigation issues
          }
        })();
      }
    };
    window.addEventListener('sqip:postLogin', handler);
    return () => window.removeEventListener('sqip:postLogin', handler);
  }, []);

  const handleSearch = useCallback(async (q, p = 1) => {
    // q: query string, p: page number (1-indexed)
    if (!q || !q.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      // cancel previous inflight search
      try { if (searchAbortRef.current) searchAbortRef.current.abort(); } catch (e) {}
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const res = await fetch(`${API_BASE}/organizations/active/?search=${encodeURIComponent(q)}&page_size=20&page=${p}`, {
        headers: authHeaders,
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (p === 1) setOrgs(results);
        else setOrgs((prev) => [...prev, ...results]);
        // server may return next as URL or null
        setNextPageUrl(data.next || null);
        setHasMore(Boolean(data.next));
        setPage(p);
        if ((data.results || []).length === 0 && p === 1) setSearchError('No organizations found. Try a different search.');
        // update recent searches only after successful results for page 1
            // Only record a recent search when it was triggered explicitly (Search button, Enter, or recent click)
            if (p === 1 && results.length > 0 && skipDebounceRef.current) {
              try {
                const trimmed = q.trim();
                setRecentSearches((prev) => {
                  const cur = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 4);
                  try { localStorage.setItem('recentSearches', JSON.stringify(cur)); } catch (e) {}
                  return cur;
                });
              } catch (e) {}
            }
            // reset manual-trigger flag so subsequent debounced searches don't record
            skipDebounceRef.current = false;
      } else if (res.status === 401) {
        localStorage.clear();
        navigate('/');
      } else {
        setSearchError('Failed to fetch organizations.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // aborted by a newer request - ignore
      } else {
        setSearchError('Network error. Please try again.');
      }
    }
    setSearching(false);
  }, [token, navigate]);

  const handleSelectOrg = async (org) => {
    // Save recent search term for convenience
    try {
      if (query && query.trim()) {
        const cur = [query.trim(), ...recentSearches.filter((s) => s !== query.trim())].slice(0, 6);
        setRecentSearches(cur);
        localStorage.setItem('recentSearches', JSON.stringify(cur));
      }
    } catch (e) {
      // ignore storage errors
    }
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
    // Check if user is logged in before allowing booking
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Open login modal with return URL
      openLogin({ from: location.pathname, preSelectOrg: selectedOrg, preSelectCat: cat });
      return;
    }
    
    setSelectedCategory(cat);
    setBookingStatus(null);
    setBookingResult(null);
    setBookingError('');
    if (cat.is_scheduled) {
      // Open scheduled booking dialog
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
        // API may return { appointment: { ... } } or the appointment object directly
        setBookingResult(data.appointment ? data.appointment : data);
        setBookingStatus('success');
      } else {
        const err = await res.json();
        // Prefer detail > non_field_errors > first errors.* message > fallback
        let msg = 'Booking failed.';
        if (err.detail) msg = err.detail;
        else if (err.non_field_errors && err.non_field_errors[0]) msg = err.non_field_errors[0];
        else if (err.errors) {
          if (typeof err.errors === 'string') msg = err.errors;
          else {
            const first = Object.values(err.errors)[0];
            if (Array.isArray(first)) msg = first[0];
            else if (typeof first === 'string') msg = first;
            else msg = JSON.stringify(err.errors);
          }
        } else {
          msg = JSON.stringify(err);
        }
        setBookingError(msg || 'Booking failed.');
        setBookingStatus('error');
      }
    } catch {
      setBookingError('Network error. Please try again.');
      setBookingStatus('error');
    }
  };

  // When the confirm dialog for a walk-in opens, fetch a small preview of the current queue
  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      if (!confirmOpen || !selectedCategory || selectedCategory.is_scheduled) return;
      try {
        const hdrs = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const r = await fetch(`${API_BASE}/appointments/unscheduled-count/?category_id=${selectedCategory.id}&status=active`, { headers: hdrs });
        if (!mounted) return;
        if (r.ok) {
          const d = await r.json();
          setConfirmPreview({ count: d.count || 0, items: [] });
        } else {
          setConfirmPreview({ count: 0, items: [] });
        }
      } catch (e) {
        if (!mounted) return;
        setConfirmPreview({ count: 0, items: [] });
      }
    };
    fetchPreview();
    return () => { mounted = false; };
  }, [confirmOpen, selectedCategory, token]);

  // Debounced live search when user types
  useEffect(() => {
    // clear pending timer
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query || !query.trim()) {
      // if query cleared, reset results — defer to avoid set-state-in-effect lint
      Promise.resolve().then(() => {
        setOrgs([]);
        setSearchError('');
        setHasMore(false);
        setNextPageUrl(null);
        setPage(1);
        // abort any inflight search when query cleared
        try { if (searchAbortRef.current) searchAbortRef.current.abort(); } catch (e) {}
      });
      return undefined;
    }
    // If we just triggered an immediate manual search (e.g. recent click), skip scheduling
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return undefined;
    }
    // Debounce a small delay to avoid spamming backend
    searchDebounceRef.current = setTimeout(() => {
      handleSearch(query, 1);
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [query, handleSearch]);

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

  const handleCloseScheduled = () => {
    setScheduledOpen(false);
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
                color: 'text.primary',
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      skipDebounceRef.current = true;
                      handleSearch(query, 1);
                    }
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
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
                  color="primary"
                  onClick={() => { skipDebounceRef.current = true; handleSearch(query, 1); }}
                  disabled={searching || !query.trim()}
                  sx={{ minWidth: 110, borderRadius: 3, px: 3, color: '#fff' }}
                >
                  {searching ? <CircularProgress size={20} color="inherit" /> : 'Search'}
                </Button>
              </Box>

              {searchError && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2, maxWidth: 620, mx: 'auto' }}>
                  {searchError}
                </Alert>
              )}

              {/* Recent searches dropdown when input focused and query empty */}
              {searchFocused && (!query || query.trim() === '') && recentSearches.length > 0 && (
                <Box sx={{ maxWidth: 620, mx: 'auto', mb: 2 }}>
                  <Paper sx={{ p: 1, borderRadius: 2 }} elevation={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>Recent searches</Typography>
                      <Button size="small" onClick={() => {
                        setRecentSearches([]);
                        try { localStorage.removeItem('recentSearches'); } catch (e) {}
                      }}>Clear all</Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {recentSearches.map((r) => (
                        <Box key={r} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Button
                            variant="text"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              // Trigger immediate search and prevent the debounced effect from firing again
                              skipDebounceRef.current = true;
                              setQuery(r);
                              handleSearch(r, 1);
                              setSearchFocused(false);
                            }}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', flex: 1 }}
                          >
                            {r}
                          </Button>
                          <IconButton size="small" onClick={() => {
                            const cur = recentSearches.filter((s) => s !== r);
                            setRecentSearches(cur);
                            try { localStorage.setItem('recentSearches', JSON.stringify(cur)); } catch (e) {}
                          }}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Box>
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {orgs.map((org) => (
                      <Fade in key={org.id}>
                        <Box sx={{ width: '100%' }}>
                          <OrgCard org={org} onClick={() => handleSelectOrg(org)} />
                        </Box>
                      </Fade>
                    ))}
                    {hasMore && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <Button variant="outlined" onClick={() => handleSearch(query, page + 1)} disabled={searching}>
                          {searching ? <CircularProgress size={18} /> : 'Load more'}
                        </Button>
                      </Box>
                    )}
                  </Box>
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
              <Card sx={{ mb: 3, background: (theme) => theme.palette.custom && theme.palette.custom.gradientPrimary }}>
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
                    <Grid item xs={12} sm={6} key={i} sx={{ display: 'flex', alignItems: 'stretch' }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {categories.map((cat) => (
                    <Fade in key={cat.id}>
                      <Box sx={{ width: '100%' }}>
                        <CategoryCard category={cat} onClick={() => handleSelectCategory(cat)} />
                      </Box>
                    </Fade>
                  ))}
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Box>

      {/* ── Scheduled Booking Dialog ─────────────────────────────────────── */}
      <SchedulerDialog
        open={scheduledOpen}
        onClose={handleCloseScheduled}
        onSuccess={() => {
          // Do NOT close the dialog here — SchedulerDialog shows its own success
          // screen with "Book Another" / "View Appointments" buttons. The user
          // will close it explicitly, which calls handleCloseScheduled.
        }}
        org={selectedOrg}
        category={selectedCategory}
        userId={userId}
        token={token}
      />

      <BookingConfirmDialog
        open={confirmOpen}
        onClose={() => bookingStatus !== 'loading' && handleCloseConfirm()}
        status={bookingStatus}
        result={bookingResult}
        error={bookingError}
        onConfirm={handleConfirmBooking}
        onBookAnother={handleCloseConfirm}
        onViewAppointments={() => { handleCloseConfirm(); navigate('/appointments'); }}
        onViewAppointment={() => { handleCloseConfirm(); navigate('/appointments', { state: { openApptId: bookingResult?.id } }); }}
          preview={confirmPreview}
      />
    </Box>
  );
}
