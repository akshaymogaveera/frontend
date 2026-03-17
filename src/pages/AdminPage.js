import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Menu,
  Select,
  InputLabel,
  FormControl,
  Grid,
  FormHelperText,
  Skeleton,
  Avatar,
  Badge,
  Stack,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { timeOnly, formatDateTime, formatServerDateTime } from '../utils/timezone.js';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import TagIcon from '@mui/icons-material/Tag';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Navbar from '../components/Navbar.js';

const API_BASE = '/api';

// Small curated country list for admin phone entry (flag emoji + dial code)
const COUNTRIES = [
  { code: 'US', label: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', label: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'GB', label: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', label: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', label: 'Canada', dial: '+1', flag: '🇨🇦' },
];

const statusConfig = {
  active:   { label: 'Active',      bg: '#e8f5e9', text: '#2e7d32', borderColor: '#4caf50' },
  inactive: { label: 'Inactive',    bg: '#f5f5f5', text: '#616161', borderColor: '#bdbdbd' },
  checkin:  { label: 'Checked In',  bg: '#e3f2fd', text: '#1565c0', borderColor: '#42a5f5' },
  checkout: { label: 'Checked Out', bg: '#ede7f6', text: '#4527a0', borderColor: '#9575cd' },
  cancel:   { label: 'Cancelled',   bg: '#fce4ec', text: '#c62828', borderColor: '#ef9a9a' },
};

function AppointmentRow({ appt, index, totalCount, onAction, loading, innerRef }) {
  const cfg = statusConfig[appt.status] || statusConfig.active;
  const canCheckin = appt.status === 'active' || appt.status === 'inactive';
  const canCheckout = appt.status === 'checkin';   // already checked-in → mark served
  const canCancel = appt.status !== 'cancel';
  // Disable move controls for scheduled appointments and for cancelled/checked-in ones
  const canMove = !appt.is_scheduled && appt.status !== 'cancel' && appt.status !== 'checkin';
  // Prefer explicit first/last name supplied by the API. Fall back to username.
  const displayName = `${(appt.user_first_name || appt.first_name || '').trim()} ${(appt.user_last_name || '').trim()}`.trim() || appt.username || `User #${appt.user}`;

  return (
    <Paper
      elevation={0}
      ref={innerRef}
      sx={{
        p: { xs: 1, sm: 2 },
        mb: 1,
        borderRadius: 3,
        border: `1px solid ${cfg.borderColor}`,
        borderLeft: `4px solid ${cfg.borderColor}`,
        background: cfg.bg,
        opacity: appt.status === 'cancel' ? 0.55 : 1,
        transition: 'box-shadow 0.12s',
        '&:hover': { boxShadow: '0 6px 18px rgba(0,0,0,0.06)' },
      }}
    >
  <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}>
        {/* Left: avatar + appointment id (stacked) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, width: { xs: 48, sm: 60 } }}>
          <Avatar
            sx={{
              width: { xs: 32, sm: 38 },
              height: { xs: 32, sm: 38 },
              background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
              fontWeight: 700,
              fontSize: { xs: 12, sm: 14 },
            }}
          >
            {appt.is_scheduled ? '📅' : (index + 1)}
          </Avatar>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: 10, sm: 11 } }}>#{appt.id}</Typography>
        </Box>

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                fontSize: { xs: '0.95rem', sm: '1rem' },
                whiteSpace: 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
              title={displayName}
            >
              {displayName}
            </Typography>
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                bgcolor: cfg.bg,
                color: cfg.text,
                border: `1px solid ${cfg.borderColor}`,
                fontWeight: 600,
                fontSize: 11,
                height: 20,
              }}
            />
          </Box>
          <Stack direction="column" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
              {/* Email and phone should be visible on mobile — allow wrapping to avoid overlap with actions */}
              {appt.user_email && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: '100%', sm: '40ch' } }}
                  title={appt.user_email}
                >
                  ✉️ {appt.user_email}
                </Typography>
              )}

              {appt.user_phone && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: '100%', sm: '20ch' } }}
                  title={appt.user_phone}
                >
                  📞 {appt.user_phone}
                </Typography>
              )}
            </Box>

            {appt.scheduled_time && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' } }}>
                  {appt.scheduled_time_display
                    ? appt.scheduled_time_display
                    : appt.scheduled_time_with_category_tz
                    ? appt.scheduled_time_with_category_tz
                    : formatServerDateTime(appt.scheduled_time)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

    {/* Action buttons */}
  <Box sx={{
            display: 'flex',
            gap: 1,
            flexShrink: 0,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            order: { xs: 3, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            mt: { xs: 1, sm: 0 },
            px: { xs: 0, sm: 'inherit' },
          }}>
          {/* Move Up (hidden for scheduled categories) */}
          {!appt.is_scheduled && (
            <Tooltip title="Move Up">
              <span>
                <IconButton
                  size="small"
                  disabled={loading || !canMove || index === 0}
                  onClick={() => onAction('move-up', appt, index)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    '&:not(:disabled):hover': { borderColor: 'primary.main', color: 'primary.main' },
                    width: { xs: 34, sm: 'auto' },
                    height: { xs: 34, sm: 'auto' },
                  }}
                >
                  <ArrowUpwardIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Move Down (hidden for scheduled categories) */}
          {!appt.is_scheduled && (
            <Tooltip title="Move Down">
              <span>
                <IconButton
                  size="small"
                  disabled={loading || !canMove || index === totalCount - 1}
                  onClick={() => onAction('move-down', appt, index)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    '&:not(:disabled):hover': { borderColor: 'primary.main', color: 'primary.main' },
                  }}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Check-In */}
          {canCheckin && (
            <Tooltip title="Check In — mark as being served">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading}
                  onClick={() => onAction('checkin', appt)}
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 2,
                    fontSize: { xs: 11, sm: 12 },
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.5 },
                    background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                    '&:hover': { opacity: 0.95 },
                  }}
                >
                  Check In
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Checkout — only for checkin status, marks as served/done */}
          {canCheckout && (
            <Tooltip title="Checkout — mark service complete">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading}
                  onClick={() => onAction('checkout', appt)}
                  startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    borderRadius: 2,
                    fontSize: 12,
                    px: 1.5,
                    background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                    '&:hover': { opacity: 0.95 },
                  }}
                >
                  Checkout
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Cancel */}
          {canCancel && (
            <Tooltip title="Cancel Appointment">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={loading}
                  onClick={() => onAction('cancel', appt)}
                  startIcon={<CancelOutlinedIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    borderRadius: 2,
                    fontSize: { xs: 11, sm: 12 },
                    px: { xs: 0.9, sm: 1.5 },
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: 110, sm: 'none' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Cancel
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function AppointmentList({ category, apptType, refreshKey = null }) {
  // apptType: 'unscheduled' | 'scheduled'
  const [appointments, setAppointments] = useState([]);
  const itemRefs = useRef({});
  const [availableDates, setAvailableDates] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const token = localStorage.getItem('accessToken');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = apptType === 'scheduled'
        ? `${API_BASE}/appointments/scheduled/?category_id=${category.id}&status=${statusFilter}&page_size=100`
        : `${API_BASE}/appointments/unscheduled/?category_id=${category.id}&status=${statusFilter}&page_size=100`;
      const res = await fetch(endpoint, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const appts = data.results || [];
        setAppointments(appts);
        // For scheduled appointment lists, derive distinct dates available for filtering
        if (apptType === 'scheduled') {
          try {
            const dates = Array.from(new Set(
              (appts || [])
                .filter((a) => a.scheduled_time)
                .map((a) => (typeof a.scheduled_time === 'string' ? a.scheduled_time.split('T')[0] : ''))
                .filter(Boolean)
            ));
            // Sort ascending
            dates.sort();
            setAvailableDates(dates);
          } catch (e) {
            setAvailableDates([]);
          }
        } else {
          setAvailableDates([]);
          setDateFilter('all');
        }
      } else {
        setError('Failed to load appointments.');
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  }, [category.id, apptType, statusFilter, token]);

  useEffect(() => {
    // Call fetchAppointments inside an async IIFE to avoid synchronous setState within the effect body
    (async () => {
      await fetchAppointments();
    })();
  }, [fetchAppointments]);

  // Re-fetch when refreshKey changes (if provided)
  useEffect(() => {
    if (refreshKey == null) return;
    (async () => {
      await fetchAppointments();
    })();
  }, [refreshKey]);

  // If the derived availableDates change and the currently selected date is
  // no longer present, reset the date filter to 'all'. This is kept outside
  // of fetchAppointments to avoid capturing dateFilter in that callback's
  // dependency array (which would break memoization rules).
  useEffect(() => {
    if (dateFilter && dateFilter !== 'all' && Array.isArray(availableDates) && !availableDates.includes(dateFilter)) {
      // Schedule the reset to the next tick to avoid synchronous setState inside an effect
      // which can trigger cascading renders and trips the eslint rule.
      const t = setTimeout(() => setDateFilter('all'), 0);
      return () => clearTimeout(t);
    }
  }, [availableDates, dateFilter]);

  const showToast = (msg, severity = 'success') => setToast({ open: true, msg, severity });
  // Compute the currently displayed appointments after applying the date filter
  const filteredAppointments = (appointments || []).filter((a) =>
    dateFilter === 'all' || !a.scheduled_time || a.scheduled_time.split('T')[0] === dateFilter
  );

  // Format date like "3rd March 2026"
  const formatDateLabel = (isoDate) => {
    try {
      const d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return isoDate;
      const day = d.getDate();
      let ord = 'th';
      if (!(day % 100 >= 11 && day % 100 <= 13)) {
        if (day % 10 === 1) ord = 'st';
        else if (day % 10 === 2) ord = 'nd';
        else if (day % 10 === 3) ord = 'rd';
      }
      const month = d.toLocaleString(undefined, { month: 'long' });
      return `${day}${ord} ${month} ${d.getFullYear()}`;
    } catch (e) {
      return isoDate;
    }
  };

  const handleAction = async (action, appt, index) => {
    setActionLoading(true);
    try {
      let res;
      if (action === 'checkin') {
        res = await fetch(`${API_BASE}/appointments/${appt.id}/check-in/`, {
          method: 'POST', headers: authHeaders,
        });
      } else if (action === 'checkout') {
        // Use dedicated checkout endpoint — records checkout_time, no counter adjustment
        res = await fetch(`${API_BASE}/appointments/${appt.id}/checkout/`, {
          method: 'POST', headers: authHeaders,
        });
      } else if (action === 'cancel') {
        res = await fetch(`${API_BASE}/appointments/${appt.id}/cancel/`, {
          method: 'POST', headers: authHeaders,
        });
      } else if (action === 'move-up') {
        const previous = index >= 2 ? appointments[index - 2] : null;
        res = await fetch(`${API_BASE}/appointments/${appt.id}/move/`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ previous_appointment_id: previous ? previous.id : null }),
        });
      } else if (action === 'move-down') {
        const previous = appointments[index + 1];
        res = await fetch(`${API_BASE}/appointments/${appt.id}/move/`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ previous_appointment_id: previous ? previous.id : null }),
        });
      }
      if (res && res.ok) {
        if (action === 'move-up' || action === 'move-down') {
          // Capture previous bounding rects
          const prevRects = {};
          (appointments || []).forEach((a) => {
            const el = itemRefs.current && itemRefs.current[a.id];
            if (el && el.getBoundingClientRect) prevRects[a.id] = el.getBoundingClientRect();
          });

          // Determine the visible neighbor to swap with (respecting filters)
          const visibleIds = (filteredAppointments || []).map((a) => a.id);
          const visIdx = visibleIds.indexOf(appt.id);
          let targetId = null;
          if (action === 'move-up' && visIdx > 0) targetId = visibleIds[visIdx - 1];
          if (action === 'move-down' && visIdx >= 0 && visIdx < visibleIds.length - 1) targetId = visibleIds[visIdx + 1];

          if (targetId) {
            const nextOrder = (appointments || []).slice();
            const idxCurr = nextOrder.findIndex((x) => x.id === appt.id);
            const idxTarget = nextOrder.findIndex((x) => x.id === targetId);
            if (idxCurr !== -1 && idxTarget !== -1) {
              [nextOrder[idxCurr], nextOrder[idxTarget]] = [nextOrder[idxTarget], nextOrder[idxCurr]];
              // Apply updated order immediately
              setAppointments(nextOrder);

              // After render, animate from old -> new positions
              requestAnimationFrame(() => {
                Object.keys(prevRects).forEach((id) => {
                  const el = itemRefs.current && itemRefs.current[id];
                  if (!el) return;
                  const prev = prevRects[id];
                  const now = el.getBoundingClientRect();
                  const dy = prev.top - now.top;
                  if (dy) {
                    // Add a subtle horizontal nudge and fade for a smoother, more organic swap.
                    // Apply the inverse transform immediately, force reflow, then enable
                    // transition and remove the transform so the browser animates into place.
                    const dx = dy > 0 ? 6 : -6;
                    // Set to previous position (no transition yet)
                    el.style.transform = `translateY(${dy}px) translateX(${dx}px)`;
                    el.style.opacity = '0.92';
                    // Force reflow
                    // eslint-disable-next-line no-unused-expressions
                    el.getBoundingClientRect();
                    // Now enable transition and animate to zero
                    el.style.transition = 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 420ms ease';
                    requestAnimationFrame(() => {
                      el.style.transform = '';
                      el.style.opacity = '';
                    });
                    // Cleanup styles after animation
                    setTimeout(() => { if (el) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; } }, 480);
                  }
                });
              });
            }
          }

          showToast('↕️ Queue updated');
        } else {
          showToast(
            action === 'checkin' ? '✅ Checked in' :
            action === 'checkout' ? '🏁 Checked out' :
            action === 'cancel' ? '❌ Cancelled' : '↕️ Queue updated'
          );
          // For other actions, refresh the list from server to ensure canonical state
          fetchAppointments();
        }
      } else if (res) {
        const err = await res.json();
        showToast(err.detail || (err.errors && JSON.stringify(err.errors)) || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setActionLoading(false);
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {/* Status filter as clickable tabs for faster switching */}
        <Tabs
          value={statusFilter}
          onChange={(_, v) => setStatusFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minWidth: 240,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 40, py: 0.5 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 2, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)' },
          }}
        >
          <Tab label="Active" value="active" />
          <Tab label="Checked In" value="checkin" />
          <Tab label="Checked Out" value="checkout" />
          <Tab label="Inactive" value="inactive" />
          <Tab label="Cancelled" value="cancel" />
        </Tabs>

        <Tooltip title="Refresh">
          <IconButton
            onClick={fetchAppointments}
            disabled={loading}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        {/* Date filter: only for scheduled appointment lists and when dates are available */}
        {apptType === 'scheduled' && Array.isArray(availableDates) && availableDates.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id={`date-filter-label-${category.id}`}>Date</InputLabel>
            <Select
              labelId={`date-filter-label-${category.id}`}
              value={dateFilter}
              label="Date"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="all">All dates</MenuItem>
              {availableDates.map((d) => (
                <MenuItem key={d} value={d}>{formatDateLabel(d)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Show counts for the currently displayed (possibly date-filtered) appointments */}
          <Typography variant="body2" color="text.secondary">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
          </Typography>
          {appointments.length > 0 && (
            <Chip
              label={filteredAppointments.length}
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
            />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading && (
        <Box>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1, borderRadius: 3 }} />
          ))}
        </Box>
      )}

      {!loading && filteredAppointments.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <EventAvailableOutlinedIcon sx={{ fontSize: 48, opacity: 0.12, mb: 1, color: (theme) => theme.palette.custom ? theme.palette.custom.teal : '#00C4CC' }} />
          <Typography variant="body2" color="text.secondary">
            No <strong>{statusFilter}</strong> {apptType} appointments.
          </Typography>
        </Box>
      )}

      {!loading && filteredAppointments.length > 0 && (
        <Fade in timeout={250}>
          <Box>
            {filteredAppointments.map((appt, i) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                index={i}
                totalCount={filteredAppointments.length}
                onAction={handleAction}
                loading={actionLoading}
                innerRef={(el) => {
                  if (!itemRefs.current) itemRefs.current = {};
                  if (el) itemRefs.current[appt.id] = el;
                  else if (itemRefs.current[appt.id]) delete itemRefs.current[appt.id];
                }}
              />
            ))}
          </Box>
        </Fade>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3 }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function CategoryPanel({ category, refreshKey = null }) {
  const [apptTab, setApptTab] = useState(0); // 0 = Unscheduled, 1 = Scheduled

  // If category explicitly indicates whether it's scheduled or not, render
  // only the appropriate appointment list (no tabs). This enforces the
  // rule that a category can only be one type.
  if (typeof category.is_scheduled === 'boolean') {
    return (
      <Box>
        {category.is_scheduled ? (
            <AppointmentList key={`${category.id}-scheduled`} category={category} apptType="scheduled" refreshKey={refreshKey} />
        ) : (
            <AppointmentList key={`${category.id}-unscheduled`} category={category} apptType="unscheduled" refreshKey={refreshKey} />
        )}
      </Box>
    );
  }

  // Fallback: if the category doesn't specify, keep the tabbed UI
  return (
    <Box>
      {/* Unscheduled / Scheduled sub-tabs */}
      <Tabs
        value={apptTab}
        onChange={(_, v) => setApptTab(v)}
        sx={{
          mb: 2.5,
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 40, py: 0.5 },
          '& .MuiTabs-indicator': {
              background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
              height: 3,
              borderRadius: 2,
            },
        }}
      >
        <Tab
          label="Walk-ins (Unscheduled)"
          icon={<DirectionsWalkIcon sx={{ fontSize: 17 }} />}
          iconPosition="start"
        />
        <Tab
          label="Scheduled"
          icon={<EventNoteIcon sx={{ fontSize: 17 }} />}
          iconPosition="start"
        />
      </Tabs>

        

      {apptTab === 0 && (
          <AppointmentList key={`${category.id}-unscheduled`} category={category} apptType="unscheduled" refreshKey={refreshKey} />
      )}
      {apptTab === 1 && (
          <AppointmentList key={`${category.id}-scheduled`} category={category} apptType="scheduled" refreshKey={refreshKey} />
      )}
    </Box>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const [organizations, setOrganizations] = useState([]);
  const [orgIndex, setOrgIndex] = useState(0);
  const [categoryTabIndexMap, setCategoryTabIndexMap] = useState({});
  // Queue modal / form state
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queueModalCategory, setQueueModalCategory] = useState(null);
  const [queueForm, setQueueForm] = useState({ first_name: '', last_name: '', phone: '', email: '' });
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  // selected country for phone entry & per-field errors (default to India)
  const defaultCountry = COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [countryAnchorEl, setCountryAnchorEl] = useState(null);
  const [queueFormErrors, setQueueFormErrors] = useState({});

  // (Intentionally no effect that sets state synchronously.)
  // refreshKey increments to trigger appointment list refetch
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  const token = localStorage.getItem('accessToken');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isStaff = localStorage.getItem('isStaff') === 'true';

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError('');
      try {
        // Staff/superuser see all categories; group admins see only their categories
        const endpoint = isStaff
          ? `${API_BASE}/categories/?page_size=100`
          : `${API_BASE}/categories/user/?page_size=100`;
        const res = await fetch(endpoint, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          setCategories(data.results || []);
          // Also fetch organizations so we can group categories by org
          try {
            const orgRes = await fetch(`${API_BASE}/organizations/?page_size=100`, { headers: authHeaders });
            if (orgRes.ok) {
              const orgData = await orgRes.json();
              setOrganizations(orgData.results || []);
            }
          } catch (e) {
            // ignore org fetch errors; we'll fallback to org id labels
          }
        } else if (res.status === 401) {
          localStorage.clear();
          navigate('/');
        } else {
          setError('Failed to load categories.');
        }
      } catch {
        setError('Network error loading categories.');
      }
      setLoading(false);
    };
    fetchCategories();
  }, [token, isStaff, navigate]);

  const handleToggleStatus = async (category) => {
    const newStatus = category.status === 'active' ? 'inactive' : 'active';
    setStatusUpdating((prev) => ({ ...prev, [category.id]: true }));
    try {
      const res = await fetch(`${API_BASE}/categories/${category.id}/update-status/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, status: newStatus } : c))
        );
        setToast({ open: true, msg: `Category "${category.name || category.description}" set to ${newStatus}`, severity: 'success' });
      } else {
        const err = await res.json();
        setToast({ open: true, msg: err.detail || 'Failed to update status', severity: 'error' });
      }
    } catch {
      setToast({ open: true, msg: 'Network error', severity: 'error' });
    }
    setStatusUpdating((prev) => ({ ...prev, [category.id]: false }));
  };

  // Queue modal handlers
  const closeQueueModal = () => {
    setQueueModalOpen(false);
    setQueueError('');
  };

  const submitQueueForm = async () => {
    if (!queueModalCategory) return;
    setQueueLoading(true);
    setQueueError('');
    setQueueFormErrors({});

    // Basic front-end validation
    const errors = {};
    if (!queueForm.first_name || queueForm.first_name.trim().length === 0) {
      errors.first_name = 'First name is required';
    }
    if (!queueForm.phone || queueForm.phone.trim().length === 0) {
      errors.phone = 'Phone is required';
    } else {
      // strip non-digits for length check but preserve leading + for full value later
      const digits = queueForm.phone.replace(/\D/g, '');
      if (digits.length < 6) errors.phone = 'Enter a valid phone number';
    }

    if (Object.keys(errors).length > 0) {
      setQueueFormErrors(errors);
      setQueueLoading(false);
      return;
    }

    // Normalize phone: ensure it starts with +countrycode
    let phoneRaw = queueForm.phone.trim();
    // If user supplied a leading +, keep it, otherwise prepend selected country's dial code
    let phoneDigits = phoneRaw.replace(/[^\d+]/g, '');
    if (!phoneDigits.startsWith('+')) {
      const dial = selectedCountry && selectedCountry.dial ? selectedCountry.dial : COUNTRIES[0].dial;
      // remove leading zeros or plus signs from phoneDigits
      const justDigits = phoneDigits.replace(/\D/g, '');
      phoneDigits = `${dial}${justDigits.startsWith('0') ? justDigits.replace(/^0+/, '') : justDigits}`;
      if (!phoneDigits.startsWith('+')) phoneDigits = `+${phoneDigits.replace(/^\+?/, '')}`;
    }

    try {
      const payload = {
        organization: queueModalCategory.organization || queueModalCategory.organization_id || queueModalCategory.org_id || queueModalCategory.organization,
        category: queueModalCategory.id,
        first_name: queueForm.first_name.trim(),
        last_name: queueForm.last_name ? queueForm.last_name.trim() : '',
        phone: phoneDigits,
        email: queueForm.email ? queueForm.email.trim() : '',
      };
      const res = await fetch(`${API_BASE}/appointments/add_user_to_queue/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // success
        setToast({ open: true, msg: 'User added to queue', severity: 'success' });
        // bump refresh key to force lists to reload
        setQueueRefreshKey((k) => k + 1);
        closeQueueModal();
      } else {
        let msg = 'Failed to add user to queue';
        try {
          const err = await res.json();
          if (!err) {
            msg = 'Failed to add user to queue';
          } else if (typeof err === 'string') {
            msg = err;
          } else if (err.detail) {
            msg = err.detail;
          } else if (err.errors) {
            if (typeof err.errors === 'string') {
              msg = err.errors;
            } else if (typeof err.errors === 'object') {
              // Extract human-readable messages from each field
              msg = Object.values(err.errors)
                .flat()
                .join(' ');
            } else {
              msg = String(err.errors);
            }
          } else if (err.message) {
            msg = err.message;
          } else if (err.non_field_errors) {
            msg = [].concat(err.non_field_errors).join(' ');
          } else {
            // Fallback: stringify whatever structure we received
            msg = JSON.stringify(err);
          }
        } catch (e) {
          msg = 'Failed to add user to queue';
        }
        setQueueError(msg);
      }
    } catch (e) {
      setQueueError('Network error');
    }
    setQueueLoading(false);
  };

  // Build organizations grouped with their categories for hierarchical tabs
  const groupedOrgs = React.useMemo(() => {
    const map = {};
    organizations.forEach((o) => { map[o.id] = { ...o, categories: [] }; });
    const unassigned = { id: null, name: 'Unassigned', categories: [] };
    categories.forEach((c) => {
      if (c.organization && map[c.organization]) {
        map[c.organization].categories.push(c);
      } else {
        unassigned.categories.push(c);
      }
    });
    // Only include organizations that actually have categories available to the user
    const arr = Object.values(map).filter((o) => Array.isArray(o.categories) && o.categories.length > 0);
    if (unassigned.categories.length) arr.push(unassigned);
    return arr;
  }, [organizations, categories]);

  const currentOrg = groupedOrgs[orgIndex] || groupedOrgs[0] || null;
  const currentCategory = currentOrg
    ? (currentOrg.categories[(categoryTabIndexMap[currentOrg.id] || 0)] || null)
    : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
        {/* Header */}
        <Fade in timeout={400}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 32, color: (theme) => theme.palette.custom ? theme.palette.custom.teal : '#00C4CC' }} />
              <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary' }}>Admin Dashboard</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Manage queues, check-ins, and category status across your organization.
            </Typography>
          </Box>
        </Fade>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {loading && (
          <Box>
            <Skeleton variant="rounded" height={48} sx={{ mb: 2, borderRadius: 3 }} />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1, borderRadius: 3 }} />
            ))}
          </Box>
        )}

        {!loading && categories.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 72, opacity: 0.15, mb: 2, color: (theme) => theme.palette.custom ? theme.palette.custom.teal : '#00C4CC' }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No categories assigned
            </Typography>
            <Typography variant="body2" color="text.disabled">
              You have no categories to manage. Ask a super admin to assign groups to your account.
            </Typography>
          </Box>
        )}

        {!loading && categories.length > 0 && (
          <Fade in timeout={300}>
            <Box>
              {/* Category tabs */}
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  overflow: 'hidden',
                  mb: 3,
                }}
              >
                {/* Organization-level tabs */}
                <Tabs
                  value={orgIndex}
                  onChange={(_, v) => setOrgIndex(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 52 },
                    '& .MuiTabs-indicator': {
                      background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                      height: 4,
                      borderRadius: 2,
                    },
                  }}
                >
                  {groupedOrgs.map((org, i) => (
                    <Tab
                      key={org.id ?? `unassigned-${i}`}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{org.name || `Org #${org.id}`}</span>
                          <Chip
                            label={`${org.categories.length}`}
                            size="small"
                            sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </Tabs>

                {/* Category tabs for the selected organization */}
                {currentOrg && (
                  <Tabs
                    value={categoryTabIndexMap[currentOrg.id] || 0}
                    onChange={(_, v) => setCategoryTabIndexMap((prev) => ({ ...prev, [currentOrg.id]: v }))}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
                      '& .MuiTabs-indicator': { background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)', height: 3, borderRadius: 2 },
                      px: 1,
                    }}
                  >
                    {currentOrg.categories.map((cat, i) => (
                      <Tab
                        key={cat.id}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{cat.name || cat.description || `Category #${cat.id}`}</span>
                            <Chip
                              label={cat.status}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 700,
                                bgcolor: cat.status === 'active' ? '#e8f5e9' : '#fce4ec',
                                color: cat.status === 'active' ? '#2e7d32' : '#c62828',
                                border: `1px solid ${cat.status === 'active' ? '#a5d6a7' : '#ef9a9a'}`,
                              }}
                            />
                            {cat.is_scheduled && (
                              <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            )}
                          </Box>
                        }
                      />
                    ))}
                  </Tabs>
                )}

                {/* Category panel content */}
                {currentCategory && (
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    {/* Category info + status toggle */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                        mb: 3,
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {currentCategory.name || currentCategory.description || `Category #${currentCategory.id}`}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              Type: {currentCategory.type || 'general'}
                            </Typography>
                          </Box>
                          {currentCategory.is_scheduled && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                Scheduled appointments
                              </Typography>
                            </Box>
                          )}
                          {currentCategory.time_zone && (
                            <Typography variant="caption" color="text.secondary">
                              TZ: {currentCategory.time_zone}
                            </Typography>
                          )}
                        </Stack>
                        {currentCategory.description && currentCategory.name && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {currentCategory.description}
                          </Typography>
                        )}
                      </Box>

                      {/* Status toggle */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {statusUpdating[currentCategory.id] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={currentCategory.status === 'active'}
                                onChange={() => handleToggleStatus(currentCategory)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#2e7d32' },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#4caf50' },
                                }}
                              />
                            }
                            label={
                              <Typography variant="body2" fontWeight={600}>
                                {currentCategory.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                              </Typography>
                            }
                          />
                        )}

                        {/* Add to queue button for UNSCHEDULED categories */}
                        {!currentCategory.is_scheduled && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DirectionsWalkIcon />}
                            onClick={() => {
                              setQueueModalCategory(currentCategory);
                              setQueueForm({ first_name: '', last_name: '', phone: '', email: '' });
                              setQueueError('');
                              setQueueFormErrors({});
                              // Detect country for Add-to-queue: prefer timezone -> navigator.language -> fallback to India
                              try {
                                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                const tzMap = {
                                  'Asia/Kolkata': 'IN',
                                  'Europe/London': 'GB',
                                  'America/New_York': 'US',
                                  'Australia/Sydney': 'AU',
                                  'America/Toronto': 'CA',
                                };
                                let code = tz && tzMap[tz];
                                if (!code && typeof navigator !== 'undefined' && navigator.language) {
                                  const parts = navigator.language.split('-');
                                  if (parts.length > 1) code = parts[1].toUpperCase();
                                }
                                const sel = COUNTRIES.find((c) => c.code === code) || COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0];
                                setSelectedCountry(sel);
                              } catch (e) {
                                setSelectedCountry(COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0]);
                              }
                              setQueueModalOpen(true);
                            }}
                            sx={{ ml: 1 }}
                          >
                            Add to queue
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* Combined Hours card: Opening Hours + Break Hours for scheduled categories */}
                    {currentCategory && currentCategory.is_scheduled && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          mb: 3,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: '#f7f4ff',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#6a1b9a', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeOutlinedIcon sx={{ fontSize: 18 }} /> Hours
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: (theme) => theme.palette.custom ? theme.palette.custom.teal : '#00C4CC', display: 'block', mb: 1 }}>
                              Opening Hours
                            </Typography>
                            {Object.keys(currentCategory.opening_hours || {}).length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(currentCategory.opening_hours).map(([day, ranges]) => (
                                  <Chip
                                    key={`open-${day}`}
                                    size="small"
                                    label={
                                      ranges && Array.isArray(ranges) && ranges.length > 0
                                        ? `${day.slice(0, 3)}: ${ranges[0][0]}–${ranges[0][1]}`
                                        : `${day.slice(0, 3)}: Closed`
                                    }
                                    sx={{
                                      fontSize: 11,
                                      bgcolor: ranges && Array.isArray(ranges) && ranges.length > 0 ? '#ede7f6' : '#f5f5f5',
                                      color: ranges && Array.isArray(ranges) && ranges.length > 0 ? '#4a148c' : '#9e9e9e',
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">No opening hours configured.</Typography>
                            )}
                            {currentCategory.time_interval_per_appointment && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Slot interval: {typeof currentCategory.time_interval_per_appointment === 'string'
                                  ? currentCategory.time_interval_per_appointment
                                  : `${currentCategory.time_interval_per_appointment} min`}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#8a4b00', display: 'block', mb: 1 }}>
                              Break Hours
                            </Typography>
                            {Object.keys(currentCategory.break_hours || {}).length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(currentCategory.break_hours).map(([day, ranges]) => (
                                  <Chip
                                    key={`break-${day}`}
                                    size="small"
                                    label={
                                      ranges && Array.isArray(ranges) && ranges.length > 0
                                        ? `${day.slice(0, 3)}: ${ranges.map((r) => `${r[0]}–${r[1]}`).join(', ')}`
                                        : `${day.slice(0, 3)}: —`
                                    }
                                    sx={{
                                      fontSize: 11,
                                      bgcolor: ranges && Array.isArray(ranges) && ranges.length > 0 ? '#fff3e0' : '#f5f5f5',
                                      color: ranges && Array.isArray(ranges) && ranges.length > 0 ? '#e65100' : '#9e9e9e',
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">No break hours configured for this category.</Typography>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {/* Appointments list for this category */}
                    <CategoryPanel category={currentCategory} refreshKey={queueRefreshKey} />
                  </Box>
                )}
              </Paper>
            </Box>
          </Fade>
        )}
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 3 }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>

      {/* Add User to Queue Modal */}
      <Dialog open={queueModalOpen} onClose={closeQueueModal} fullWidth maxWidth="sm">
        <DialogTitle>Add user to queue — {queueModalCategory ? (queueModalCategory.name || `Category #${queueModalCategory.id}`) : ''}</DialogTitle>
        <DialogContent>
          {queueError && <Alert severity="error" sx={{ mb: 2 }}>{queueError}</Alert>}
          <Box component="form" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  size="small"
                  label="First name"
                  value={queueForm.first_name}
                  onChange={(e) => setQueueForm((f) => ({ ...f, first_name: e.target.value }))}
                  fullWidth
                  error={!!queueFormErrors.first_name}
                  helperText={queueFormErrors.first_name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  size="small"
                  label="Last name"
                  value={queueForm.last_name}
                  onChange={(e) => setQueueForm((f) => ({ ...f, last_name: e.target.value }))}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  required
                  size="small"
                  label="Phone"
                  value={queueForm.phone}
                  onChange={(e) => setQueueForm((f) => ({ ...f, phone: e.target.value }))}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => setCountryAnchorEl(e.currentTarget)}
                          sx={{ mr: 0, p: 0, minWidth: 36, display: 'inline-flex', alignItems: 'center' }}
                        >
                          <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{selectedCountry.flag}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5 }}>{selectedCountry.dial}</Typography>
                        </IconButton>
                        <Menu
                          anchorEl={countryAnchorEl}
                          open={Boolean(countryAnchorEl)}
                          onClose={() => setCountryAnchorEl(null)}
                        >
                          {COUNTRIES.map((c) => (
                            <MenuItem
                              key={c.code}
                              onClick={() => {
                                setSelectedCountry(c);
                                setCountryAnchorEl(null);
                              }}
                            >
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{c.flag}<Typography sx={{ ml: 0.5 }}>{c.label} ({c.dial})</Typography></Box>
                            </MenuItem>
                          ))}
                        </Menu>
                      </InputAdornment>
                    ),
                  }}
                  error={!!queueFormErrors.phone}
                  helperText={queueFormErrors.phone || 'Enter local phone number (will be saved with selected country code)'}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  size="small"
                  label="Email (optional)"
                  value={queueForm.email}
                  onChange={(e) => setQueueForm((f) => ({ ...f, email: e.target.value }))}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQueueModal} disabled={queueLoading}>Cancel</Button>
          <Button
            onClick={submitQueueForm}
            variant="contained"
            disabled={queueLoading}
            sx={{
              borderRadius: 3,
              background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
              color: '#fff',
              px: 3,
              '&:hover': { opacity: 0.95 },
            }}
          >
            {queueLoading ? <CircularProgress size={18} color="inherit" /> : 'Add to queue'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
