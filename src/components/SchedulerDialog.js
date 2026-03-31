import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { formatDate, formatServerDateTime } from '../utils/timezone.js';
import { API_BASE } from '../utils/api.js';

/**
 * Full scheduling dialog: category info, React calendar, slot picker,
 * per-day limit awareness, and booking confirmation.
 *
 * Props:
 *   open          – boolean
 *   onClose       – () => void
 *   onSuccess     – (appointment) => void  (called after successful booking)
 *   org           – { id, name }
 *   category      – Category object
 *   userId        – number
 *   token         – string (JWT)
 */
export default function SchedulerDialog({ open, onClose, onSuccess, org, category, userId, token }) {
  const navigate = useNavigate();

  // ── state ──────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [scheduledCountForDate, setScheduledCountForDate] = useState(null);
  const [scheduledLimit, setScheduledLimit] = useState(null);
  const [scheduledLimitMsg, setScheduledLimitMsg] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [userNote, setUserNote] = useState('');

  // Set of 'YYYY-MM-DD' strings that have no bookable slots (greyed out in calendar)
  const [disabledDates, setDisabledDates] = useState(new Set());
  // Whether the prefetch of all dates in the window is still running
  const [prefetching, setPrefetching] = useState(false);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // ── derived ────────────────────────────────────────────────────────────
  // Today's date in the category timezone (used for calendar window + slot past-check).
  const localTodayStr = (() => {
    const tz = category?.time_zone || 'UTC';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const gp = (t) => (parts.find((p) => p.type === t) || {}).value || '00';
    return `${gp('year')}-${gp('month')}-${gp('day')}`;
  })();

  // Last selectable date: today (in category tz) + (max_advance_days - 1) extra days.
  // e.g. max_advance_days=7 → today is day 1, so +6 days → window of 7 days.
  const maxDate = (() => {
    const configured = category?.max_advance_days ?? 7;
    const [y, m, d] = localTodayStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + Math.max(0, configured - 1));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  })();

  // Helper: does a slot entry have at least one bookable slot?
  // The backend returns slot times as naive strings in the category's timezone
  // (e.g. "06:00" means 06:00 Asia/Calcutta). We compare them against the
  // current moment expressed in the same timezone — no UTC conversion.
  const hasAnyBookableSlot = (rawSlots, dateStr) => {
    const catTz = category?.time_zone || 'UTC';
    // Get the current wall-clock time in the category timezone as "HH:MM"
    const nowInCatTz = new Intl.DateTimeFormat('en-CA', {
      timeZone: catTz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const getPart = (parts, t) => (parts.find((p) => p.type === t) || {}).value || '00';
    const nowDateStr = `${getPart(nowInCatTz, 'year')}-${getPart(nowInCatTz, 'month')}-${getPart(nowInCatTz, 'day')}`;
    const nowTimeStr = `${getPart(nowInCatTz, 'hour')}:${getPart(nowInCatTz, 'minute')}`;

    return rawSlots.some((entry) => {
      if (!Boolean(entry[1])) return false; // server says booked
      const startTime = Array.isArray(entry[0]) ? entry[0][0] : entry[0];
      // Compare as plain strings: "YYYY-MM-DD HH:MM" in category tz
      const slotKey = `${dateStr} ${startTime}`;
      const nowKey  = `${nowDateStr} ${nowTimeStr}`;
      if (slotKey <= nowKey) return false; // past or current minute
      return true;
    });
  };

  // ── reset + prefetch when dialog opens ────────────────────────────────
  useEffect(() => {
    if (!open || !category) return;

    setSelectedDate('');
    setSlots([]);
    setSlotsError('');
    setSelectedSlot(null);
    setBookingStatus(null);
    setBookingResult(null);
    setBookingError('');
    setScheduledCountForDate(null);
    setScheduledLimit(null);
    setScheduledLimitMsg('');
    setDisabledDates(new Set());
    setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    // Eagerly fetch availability for every date in the window so the calendar
    // can immediately show which days are open/closed.
    let mounted = true;
    setPrefetching(true);

    (async () => {
      // Build the list of all dates from today through maxDate
      const dates = [];
      const start = new Date(localTodayStr + 'T00:00:00');
      const end = new Date(maxDate + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }

      // Fire all requests in parallel for speed
      const results = await Promise.all(
        dates.map(async (ds) => {
          try {
            const res = await fetch(
              `${API_BASE}/appointments/availability/?date=${ds}&category_id=${category.id}`,
              { headers: authHeaders }
            );
            if (!res.ok) return { ds, bookable: false };
            const data = await res.json();
            const rawSlots = Array.isArray(data) ? data : (data.slots || []);
            return { ds, bookable: hasAnyBookableSlot(rawSlots, ds) };
          } catch {
            return { ds, bookable: false };
          }
        })
      );

      if (!mounted) return;

      // Collect dates with no bookable slots
      const disabled = new Set(results.filter((r) => !r.bookable).map((r) => r.ds));
      setDisabledDates(disabled);
      setPrefetching(false);
    })();

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  // ── date change handler ────────────────────────────────────────────────
  const handleDateChange = useCallback(async (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setScheduledCountForDate(null);
    setScheduledLimit(null);
    setScheduledLimitMsg('');
    if (!dateStr || !category) return;
    setLoadingSlots(true);
    setSlotsError('');
    setSlots([]);
    try {
      const res = await fetch(
        `${API_BASE}/appointments/availability/?date=${dateStr}&category_id=${category.id}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        const rawSlots = Array.isArray(data) ? data : (data.slots || []);
        // Normalize slots.
        // The backend returns slot times as naive strings in the category's timezone
        // (e.g. dateStr="2026-03-21", startTime="06:00" means 06:00 Asia/Calcutta).
        // Compare against the current moment in the same timezone — no UTC wrapping.
        const catTz = category?.time_zone || 'UTC';
        const nowParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: catTz,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date());
        const gp = (t) => (nowParts.find((p) => p.type === t) || {}).value || '00';
        const nowKey = `${gp('year')}-${gp('month')}-${gp('day')} ${gp('hour')}:${gp('minute')}`;

        // Past slots are completely hidden (not shown as disabled buttons).
        const normalized = rawSlots
          .map((entry) => {
            const timeRange = entry[0];
            const serverAvailable = Boolean(entry[1]);
            const startTime = Array.isArray(timeRange) ? timeRange[0] : timeRange;
            const isoStart = `${dateStr}T${startTime}:00`;

            // Treat slot time as category-tz wall time. Hide if at or before now.
            const slotKey = `${dateStr} ${startTime}`;
            if (slotKey <= nowKey) return null; // past — hide entirely

            const reason = serverAvailable ? undefined : 'booked';
            return [isoStart, serverAvailable, reason];
          })
          .filter(Boolean); // strip out past (null) entries entirely

        const hasBookable = normalized.some(([, avail]) => Boolean(avail));
        if (!hasBookable) {
          setSlots([]);
          setSlotsError('No bookable slots for this date. Please choose another date.');
          setSelectedDate('');
          // Mark this date as disabled so the calendar reflects it
          setDisabledDates((prev) => new Set([...prev, dateStr]));
          setCalendarOpen(true);
        } else {
          setSlots(normalized);
          // Fetch per-day limit info in parallel
          try {
            const scRes = await fetch(
              `${API_BASE}/appointments/scheduled-count/?date=${dateStr}&category_id=${category.id}`,
              { headers: authHeaders }
            );
            if (scRes.ok) {
              const scData = await scRes.json();
              const cnt = typeof scData.count === 'number' ? scData.count : 0;
              const lim = scData.limit == null ? null : scData.limit;
              setScheduledCountForDate(cnt);
              setScheduledLimit(lim);
              if (lim != null && cnt >= lim) {
                setScheduledLimitMsg(`You already have ${cnt} scheduled appointment(s) on this date; the limit is ${lim} per day.`);
              }
            }
          } catch { /* ignore limit fetch errors */ }
        }
      } else {
        setSlotsError('Could not load availability.');
      }
    } catch {
      setSlotsError('Network error loading slots.');
    }
    setLoadingSlots(false);
  }, [category, authHeaders]);

  // ── calendar helpers ───────────────────────────────────────────────────
  const isDisabledDate = (d) => {
    if (!d) return true;
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Outside the selectable window
    if (s < localTodayStr || s > maxDate) return true;
    // No bookable slots for this date (from prefetch)
    if (disabledDates.has(s)) return true;
    return false;
  };

  const getMonthMatrix = (d) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = new Array(7).fill(null);
    let day = 1;
    for (let i = startDay; i < 7; i++) week[i] = new Date(year, month, day++);
    weeks.push(week);
    while (day <= daysInMonth) {
      week = new Array(7).fill(null);
      for (let i = 0; i < 7 && day <= daysInMonth; i++) week[i] = new Date(year, month, day++);
      weeks.push(week);
    }
    return weeks;
  };

  const openCalendar = () => {
    setCalendarMonth(selectedDate
      ? new Date(new Date(selectedDate + 'T00:00:00').getFullYear(), new Date(selectedDate + 'T00:00:00').getMonth(), 1)
      : new Date());
    setCalendarOpen(true);
  };

  const selectDateFromCalendar = (dateStr) => {
    // Clamp to the selectable window — effectiveMaxDate is gone, use maxDate directly.
    let clamped = dateStr;
    if (clamped < localTodayStr) clamped = localTodayStr;
    if (clamped > maxDate) clamped = maxDate;
    handleDateChange(clamped);
    setCalendarOpen(false);
  };

  // ── booking ────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setBookingStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/appointments/schedule/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          organization: org?.id,
          category: category?.id,
          user: parseInt(userId, 10),
          scheduled_time: selectedSlot,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const appt = data.appointment || data;
        // Post optional user note (best-effort, non-blocking)
        if (userNote.trim() && appt?.id) {
          fetch(`${API_BASE}/appointments/${appt.id}/notes/`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ content: userNote.trim() }),
          }).catch(() => {});
        }
        setBookingResult(appt);
        setBookingStatus('success');
        if (onSuccess) onSuccess(appt);
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

  const handleClose = () => {
    if (bookingStatus !== 'loading') onClose();
  };

  const limitReached = scheduledLimit != null && scheduledCountForDate != null && scheduledCountForDate >= scheduledLimit;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: '20px 20px 0 0', sm: 4 },
            overflow: 'hidden',
            m: { xs: 0, sm: 2 },
            // On mobile: sheet slides up from the bottom
            position: { xs: 'fixed', sm: 'relative' },
            bottom: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: undefined },
            maxHeight: { xs: '92vh', sm: '90vh' },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Gradient top bar. On mobile, include the safe-area inset so the header isn't hidden by notches/status-bar */}
        <Box sx={{
          height: { xs: 'calc(env(safe-area-inset-top, 0px) + 4px)', sm: 4 },
          flexShrink: 0,
          background: (theme) => theme.palette.custom?.gradientPrimary ?? 'linear-gradient(90deg,#00C4CC,#007BFF)',
        }} />

        {/* ── Header ── */}
        <DialogTitle sx={{
          fontWeight: 700,
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {bookingStatus === 'success' ? (
            <Typography variant="h6" fontWeight={700}>Appointment Booked! 🎉</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayOutlinedIcon fontSize="small" sx={{ color: (theme) => theme.palette.custom?.teal ?? '#00C4CC' }} />
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Schedule an Appointment
              </Typography>
            </Box>
          )}
          <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary', ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* ── Scrollable content ── */}
        <DialogContent sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 0.5, sm: 1 },
          pb: 1,
          overflowY: 'auto',
          flex: 1,
        }}>
          {/* ── Success state ── */}
          {bookingStatus === 'success' && bookingResult ? (
            <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <CheckCircleOutlineIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: 'success.main', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Your appointment is confirmed</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, p: 2, mt: 1.5, textAlign: 'left', bgcolor: 'rgba(46,125,50,0.04)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Scheduled time:</strong>{' '}
                  {bookingResult.scheduled_time_display
                    || bookingResult.scheduled_time_with_category_tz
                    || (selectedSlot ? formatServerDateTime(selectedSlot) : '-')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Status:</strong> {bookingResult.status ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Appointment ID:</strong> {bookingResult.id ? `#${bookingResult.id}` : '-'}
                </Typography>
              </Box>
            </Box>
          ) : bookingStatus === 'loading' ? (
            <Box sx={{ textAlign: 'center', py: { xs: 4, sm: 5 } }}>
              <CircularProgress sx={{ mb: 1.5 }} />
              <Typography color="text.secondary">Booking your appointment…</Typography>
            </Box>
          ) : (
            <Box>
              {/* ── Category info chip ── */}
              <Box sx={{
                bgcolor: 'rgba(131,58,180,0.05)',
                border: '1px solid rgba(131,58,180,0.15)',
                borderRadius: 2,
                p: { xs: 1.25, sm: 1.5 },
                mb: { xs: 2, sm: 2.5 },
              }}>
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                  {org?.name}{category?.name || category?.description ? ` — ${category.name || category.description}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 }, mt: 0.75 }}>
                  {category?.time_zone && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, px: 1, py: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>🕐 {category.time_zone}</Typography>
                    </Box>
                  )}
                  {category?.max_scheduled_per_user_per_day != null && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, bgcolor: 'rgba(255,152,0,0.08)', borderRadius: 1, px: 1, py: 0.25 }}>
                      <Typography variant="caption" color="warning.dark" sx={{ fontSize: '0.7rem' }}>
                        Max {category.max_scheduled_per_user_per_day}/day
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── Step 1: Date ── */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                1 · Pick a date
              </Typography>
              <Button
                variant="outlined"
                startIcon={prefetching ? <CircularProgress size={14} /> : <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={openCalendar}
                fullWidth
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  justifyContent: 'center',
                  py: { xs: 1.25, sm: 1 },
                  mb: { xs: 2, sm: 2.5 },
                  fontWeight: selectedDate ? 700 : 400,
                  fontSize: { xs: '0.95rem', sm: '0.875rem' },
                  color: selectedDate ? 'primary.main' : 'text.secondary',
                  borderColor: selectedDate ? 'primary.main' : 'divider',
                  bgcolor: selectedDate ? 'rgba(0,123,255,0.04)' : 'transparent',
                }}
              >
                {selectedDate ? formatDate(selectedDate) : prefetching ? 'Loading available dates…' : 'Tap to pick a date'}
              </Button>

              {/* ── Step 2: Slots ── */}
              {selectedDate && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    2 · Pick a time slot
                  </Typography>

                  {loadingSlots && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} variant="rounded" width={80} height={38} sx={{ borderRadius: 2 }} />
                      ))}
                    </Box>
                  )}

                  {slotsError && !loadingSlots && (
                    <Alert severity="info" sx={{ borderRadius: 2, mb: 2, fontSize: '0.82rem' }}>{slotsError}</Alert>
                  )}
                  {scheduledLimitMsg && !loadingSlots && (
                    <Alert severity="warning" sx={{ borderRadius: 2, mb: 2, fontSize: '0.82rem' }}>{scheduledLimitMsg}</Alert>
                  )}

                  {!loadingSlots && slots.length > 0 && (
                    <>
                      {/* Slot grid — 4 columns on mobile so slots are compact */}
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(5, 1fr)' },
                        gap: { xs: 0.75, sm: 1 },
                        mb: 1.5,
                      }}>
                        {slots.map(([time, available]) => {
                          const isSelected = selectedSlot === time;
                          const displayTime = time.includes('T') ? time.split('T')[1].slice(0, 5) : time;
                          return (
                            <Tooltip key={time} title={available ? 'Tap to select' : 'Already booked'} arrow>
                              <span>
                                <Button
                                  size="small"
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  disabled={!available}
                                  onClick={() => setSelectedSlot(isSelected ? null : time)}
                                  fullWidth
                                  sx={{
                                    borderRadius: 2,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    px: 0,
                                    py: { xs: 0.9, sm: 0.75 },
                                    minWidth: 0,
                                    fontWeight: isSelected ? 700 : 500,
                                    borderColor: available ? '#2e7d32' : '#e0e0e0',
                                    color: isSelected ? '#fff' : available ? '#2e7d32' : '#bdbdbd',
                                    bgcolor: isSelected ? '#2e7d32' : available ? '#f1f8e9' : '#fafafa',
                                    '&:hover': { bgcolor: available && !isSelected ? '#dcedc8' : undefined },
                                    '&.Mui-disabled': { color: '#bdbdbd', bgcolor: '#fafafa', borderColor: '#e0e0e0', opacity: 1 },
                                  }}
                                >
                                  {displayTime}
                                </Button>
                              </span>
                            </Tooltip>
                          );
                        })}
                      </Box>

                      {/* Legend */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50' }} />
                          <Typography variant="caption" color="text.secondary">Available</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e0e0e0' }} />
                          <Typography variant="caption" color="text.secondary">Occupied</Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </>
              )}

              {/* Error */}
              {bookingStatus === 'error' && (
                <Alert severity="error" sx={{ borderRadius: 2, mt: 1.5, fontSize: '0.82rem' }}>{bookingError}</Alert>
              )}

              {/* Selected slot summary */}
              {selectedSlot && (
                <Box sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.5 }, bgcolor: 'rgba(0,123,255,0.05)', border: '1px solid rgba(0,123,255,0.2)', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                    ✓ Selected: {formatServerDateTime(selectedSlot)}
                  </Typography>
                </Box>
              )}
              {/* Optional note for this appointment */}
              {selectedSlot && bookingStatus !== 'success' && (
                <TextField
                  size="small"
                  multiline
                  minRows={2}
                  fullWidth
                  placeholder="Note for the staff (optional)"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value.slice(0, 1000))}
                  inputProps={{ maxLength: 1000 }}
                  helperText={`${userNote.length}/1000`}
                  FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
                  sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
                />
              )}
            </Box>
          )}
        </DialogContent>

        {/* ── Actions ── */}
        <DialogActions sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2.5, sm: 3 },
          pt: { xs: 1, sm: 1.5 },
          gap: 1.5,
          flexDirection: { xs: 'column', sm: 'row' },
          flexShrink: 0,
        }}>
          {bookingStatus === 'success' ? (
            <>
              <Button
                onClick={handleClose}
                variant="outlined"
                fullWidth
                sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 }, order: { xs: 2, sm: 1 } }}
              >
                Book Another
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<EventAvailableOutlinedIcon />}
                onClick={() => { handleClose(); navigate('/appointments', { state: { openApptId: bookingResult?.id } }); }}
                sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 }, background: (theme) => theme.palette.custom?.gradientPrimary, color: '#fff', order: { xs: 1, sm: 2 } }}
              >
                View Appointment
              </Button>
            </>
          ) : bookingStatus !== 'loading' ? (
            bookingError && /already exist/i.test(bookingError) ? (
              <>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  fullWidth
                  sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 } }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<EventAvailableOutlinedIcon />}
                  onClick={() => { handleClose(); navigate('/appointments'); }}
                  sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 }, background: (theme) => theme.palette.custom?.gradientPrimary, color: '#fff' }}
                >
                  View Appointments
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  fullWidth
                  sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 }, order: { xs: 2, sm: 1 } }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!selectedSlot || limitReached}
                  onClick={handleConfirm}
                  sx={{ borderRadius: 2.5, textTransform: 'none', py: { xs: 1.25, sm: 1 }, background: (theme) => theme.palette.custom?.gradientPrimary, color: '#fff', order: { xs: 1, sm: 2 } }}
                >
                  Confirm Booking
                </Button>
              </>
            )
          ) : null}
        </DialogActions>
      </Dialog>

      {/* Nested calendar picker dialog */}
      <Dialog open={calendarOpen} onClose={() => setCalendarOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} sx={{ minWidth: 32, px: 0.5 }}>‹</Button>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 160, textAlign: 'center' }}>
              {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </Typography>
            <Button size="small" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} sx={{ minWidth: 32, px: 0.5 }}>›</Button>
          </Box>
          <IconButton size="small" onClick={() => setCalendarOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, px: 1.5 }}>
          {prefetching && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Checking availability for all dates…</Typography>
            </Box>
          )}
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <Box component="thead">
              <Box component="tr">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <Box component="th" key={d} sx={{ width: '14.28%', textAlign: 'center', pb: 1, fontWeight: 700, color: 'text.secondary', fontSize: 12, fontFamily: 'inherit' }}>{d}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {getMonthMatrix(calendarMonth).map((week, wi) => (
                <Box component="tr" key={wi}>
                  {week.map((dt, di) => {
                    if (!dt) return <Box component="td" key={di} />;
                    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                    const outOfWindow = dateStr < localTodayStr || dateStr > maxDate;
                    const isClosed = !outOfWindow && disabledDates.has(dateStr);
                    const disabled = outOfWindow || isClosed;
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === localTodayStr;
                    return (
                      <Box component="td" key={di} sx={{ textAlign: 'center', p: '2px 0' }}>
                        <Box
                          component={disabled ? 'span' : 'button'}
                          onClick={disabled ? undefined : () => selectDateFromCalendar(dateStr)}
                          title={isClosed ? 'No available slots' : undefined}
                          sx={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: '50%',
                            border: isToday && !isSelected ? '2px solid' : 'none',
                            borderColor: 'primary.main',
                            bgcolor: isSelected ? 'primary.main'
                              : isClosed ? 'rgba(0,0,0,0.06)'
                              : isToday ? 'rgba(0,196,204,0.10)'
                              : 'transparent',
                            color: isSelected ? '#fff'
                              : outOfWindow ? 'text.disabled'
                              : isClosed ? 'text.disabled'
                              : 'text.primary',
                            fontWeight: isSelected || isToday ? 700 : 400,
                            fontSize: 13, fontFamily: 'inherit',
                            cursor: disabled ? 'default' : 'pointer',
                            outline: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'background 0.15s',
                            textDecoration: isClosed ? 'line-through' : 'none',
                            '&:hover': disabled ? {} : { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
                          }}
                        >
                          {dt.getDate()}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, px: 0.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">Selected</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.1)', border: '1px solid #ccc' }} />
              <Typography variant="caption" color="text.secondary">Closed / no slots</Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
