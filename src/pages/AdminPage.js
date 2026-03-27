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
  Checkbox,
  ListItemText,
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
import DeleteIcon from '@mui/icons-material/Delete';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import ConfirmDialog from '../components/ConfirmDialog.js';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import Navbar from '../components/Navbar.js';
import { ENDPOINTS, apiCall } from '../utils/api.js';

const API_BASE = '/api';

/**
 * Parse an API error response body into a human-readable string.
 * Handles: { detail }, { errors: string }, { errors: { field: [msgs] } },
 *          { message }, { non_field_errors }, raw strings, and JSON fallback.
 */
function parseApiError(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.detail) return err.detail;
  if (err.message) return err.message;
  if (err.non_field_errors) return [].concat(err.non_field_errors).join(' ');
  if (err.errors) {
    if (typeof err.errors === 'string') return err.errors;
    if (typeof err.errors === 'object') {
      return Object.entries(err.errors)
        .map(([field, msgs]) => {
          const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          const msg = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          return `${fieldLabel}: ${msg}`;
        })
        .join(' · ');
    }
  }
  // Last resort: try to extract any string values from the object
  try {
    const vals = Object.values(err).flat().filter((v) => typeof v === 'string');
    if (vals.length) return vals.join(' · ');
  } catch (_) { /* ignore */ }
  return fallback;
}

// Small curated country list for admin phone entry (flag emoji + dial code)
const COUNTRIES = [
  { code: 'US', label: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', label: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'GB', label: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', label: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', label: 'Canada', dial: '+1', flag: '🇨🇦' },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const statusConfig = {
  active:   { label: 'Active',      bg: '#e8f5e9', text: '#2e7d32', borderColor: '#4caf50' },
  inactive: { label: 'Inactive',    bg: '#f5f5f5', text: '#616161', borderColor: '#bdbdbd' },
  checkin:  { label: 'Checked In',  bg: '#e3f2fd', text: '#1565c0', borderColor: '#42a5f5' },
  checkout: { label: 'Checked Out', bg: '#ede7f6', text: '#4527a0', borderColor: '#9575cd' },
  cancel:   { label: 'Cancelled',   bg: '#fce4ec', text: '#c62828', borderColor: '#ef9a9a' },
};

// ---------------------------------------------------------------------------
// NotesPanel — shown below an appointment row when the admin clicks "Notes"
// ---------------------------------------------------------------------------
const NOTE_MAX_CHARS = 1000;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function NotesPanel({ appt, token }) {
  const API_BASE_NOTES = '/api';
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteFile, setNoteFile] = useState(null); // { name, mime, data (base64 data-url) }
  const [submitting, setSubmitting] = useState(false);
  const [noteError, setNoteError] = useState('');
  const fileRef = React.useRef(null);
  // keep a stable ref to the latest token so effects/callbacks always use current value
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  const apptIdRef = React.useRef(appt.id);
  apptIdRef.current = appt.id;

  const doFetch = React.useRef(async () => {
    setLoadingNotes(true);
    try {
      const data = await apiCall(ENDPOINTS.APPOINTMENT_NOTES(apptIdRef.current));
      setNotes(data);
    } catch (e) { /* ignore */ }
    setLoadingNotes(false);
  });

  useEffect(() => {
    (async () => { await doFetch.current(); })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.includes(mime)) {
      setNoteError('Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setNoteError('File must be under 5 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setNoteError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNoteFile({ name: file.name, mime, data: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() && !noteFile) {
      setNoteError('Please add a note or attach a file.');
      return;
    }
    setNoteError('');
    setSubmitting(true);
    try {
      const body = {
        content: noteText.trim(),
        ...(noteFile ? { file_data: noteFile.data, file_name: noteFile.name, file_mime: noteFile.mime } : {}),
      };
      await apiCall(ENDPOINTS.APPOINTMENT_NOTES(apptIdRef.current), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setNoteText('');
      setNoteFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await doFetch.current();
    } catch (err) {
      setNoteError(err.message || 'Failed to add note');
    }
    setSubmitting(false);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await apiCall(ENDPOINTS.APPOINTMENT_NOTES(apptIdRef.current) + noteId + '/', {
        method: 'DELETE',
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch { /* ignore */ }
  };

  const handleDownloadFile = async (noteId) => {
    try {
      const { file_data, file_name } = await apiCall(ENDPOINTS.APPOINTMENT_NOTE_FILE(apptIdRef.current, noteId));
      if (!file_data) return;
      const a = document.createElement('a');
      a.href = file_data;
      a.download = file_name || 'attachment';
      a.click();
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
      <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
        Notes &amp; Attachments
      </Typography>

      {/* Existing notes */}
      {loadingNotes ? (
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2, mb: 1 }} />
      ) : notes.length === 0 ? (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>No notes yet.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
          {notes.map((note) => (
            <Paper
              key={note.id}
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: note.is_admin_note ? '1px solid #bbdefb' : '1px solid #e0e0e0',
                background: note.is_admin_note ? '#e3f2fd' : '#fafafa',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <NoteOutlinedIcon sx={{ fontSize: 16, mt: 0.2, color: note.is_admin_note ? '#1565c0' : '#9e9e9e', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {note.content && (
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.82rem' }}>{note.content}</Typography>
                )}
                {note.has_file && (
                  <Button
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleDownloadFile(note.id)}
                    sx={{ mt: 0.5, fontSize: 11, py: 0.25, px: 0.75, borderRadius: 1.5, textTransform: 'none', color: 'primary.main' }}
                  >
                    {note.file_name || 'Download file'}
                  </Button>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                  {note.is_admin_note ? '🛡 Admin' : '👤 User'} · {note.added_by_name || ''} · {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                </Typography>
              </Box>
              <Tooltip title="Delete note">
                <IconButton size="small" onClick={() => handleDeleteNote(note.id)} sx={{ flexShrink: 0, color: 'error.light' }}>
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add note form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          size="small"
          multiline
          minRows={2}
          placeholder="Add a note (optional)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value.slice(0, NOTE_MAX_CHARS))}
          inputProps={{ maxLength: NOTE_MAX_CHARS }}
          helperText={`${noteText.length}/${NOTE_MAX_CHARS}`}
          FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
        />
        {noteError && <Typography variant="caption" color="error">{noteError}</Typography>}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<AttachFileIcon sx={{ fontSize: 14 }} />}
            onClick={() => fileRef.current && fileRef.current.click()}
            sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}
          >
            {noteFile ? noteFile.name : 'Attach file'}
          </Button>
          {noteFile && (
            <Tooltip title="Remove attachment">
              <IconButton size="small" onClick={() => { setNoteFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          <Button
            size="small"
            variant="contained"
            startIcon={<NoteAddOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={handleAddNote}
            disabled={submitting}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: 12,
              background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
            }}
          >
            {submitting ? 'Saving…' : 'Add Note'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function AppointmentRow({ appt, index, totalCount, onAction, loading, innerRef, token }) {
  const cfg = statusConfig[appt.status] || statusConfig.active;
  const canCheckin = appt.status === 'active' || appt.status === 'inactive';
  const canCheckout = appt.status === 'checkin';   // already checked-in → mark served
  const canCancel = appt.status !== 'cancel';
  // Disable move controls for scheduled appointments and for cancelled/checked-in ones
  const canMove = !appt.is_scheduled && appt.status !== 'cancel' && appt.status !== 'checkin';
  // Prefer explicit first/last name supplied by the API. Fall back to username.
  const displayName = `${(appt.user_first_name || appt.first_name || '').trim()} ${(appt.user_last_name || '').trim()}`.trim() || appt.username || `User #${appt.user}`;
  const [showNotes, setShowNotes] = useState(false);

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
            gap: 0.75,
            flexShrink: 0,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            order: { xs: 3, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            mt: { xs: 1, sm: 0 },
            px: { xs: 0, sm: 'inherit' },
          }}>
          {/* Move Up/Down — icon only, always compact */}
          {!appt.is_scheduled && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Move Up">
                <span>
                  <IconButton
                    size="small"
                    disabled={loading || !canMove || index === 0}
                    onClick={() => onAction('move-up', appt, index)}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, width: 30, height: 30, '&:not(:disabled):hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move Down">
                <span>
                  <IconButton
                    size="small"
                    disabled={loading || !canMove || index === totalCount - 1}
                    onClick={() => onAction('move-down', appt, index)}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, width: 30, height: 30, '&:not(:disabled):hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}

          {/* Check-In — icon on mobile, icon+label on desktop */}
          {canCheckin && (
            <Tooltip title="Check In">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading}
                  onClick={() => onAction('checkin', appt)}
                  sx={{
                    borderRadius: 2,
                    minWidth: { xs: 36, sm: 'auto' },
                    px: { xs: 0, sm: 1.5 },
                    py: 0.5,
                    background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                    '&:hover': { opacity: 0.95 },
                  }}
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5, fontSize: 12 }}>Check In</Box>
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Checkout — icon on mobile, icon+label on desktop */}
          {canCheckout && (
            <Tooltip title="Checkout">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading}
                  onClick={() => onAction('checkout', appt)}
                  sx={{
                    borderRadius: 2,
                    minWidth: { xs: 36, sm: 'auto' },
                    px: { xs: 0, sm: 1.5 },
                    py: 0.5,
                    background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                    '&:hover': { opacity: 0.95 },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: 15 }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5, fontSize: 12 }}>Checkout</Box>
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Cancel — icon on mobile, icon+label on desktop */}
          {canCancel && (
            <Tooltip title="Cancel">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={loading}
                  onClick={() => onAction('cancel', appt)}
                  sx={{
                    borderRadius: 2,
                    minWidth: { xs: 36, sm: 'auto' },
                    px: { xs: 0, sm: 1.5 },
                    py: 0.5,
                  }}
                >
                  <CancelOutlinedIcon sx={{ fontSize: 15 }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5, fontSize: 12 }}>Cancel</Box>
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Notes toggle — icon on mobile, icon+label on desktop */}
          <Tooltip title={showNotes ? 'Hide Notes' : 'Notes'}>
            <Button
              size="small"
              variant={showNotes ? 'contained' : 'outlined'}
              onClick={() => setShowNotes((v) => !v)}
              sx={{
                borderRadius: 2,
                minWidth: { xs: 36, sm: 'auto' },
                px: { xs: 0, sm: 1.25 },
                py: 0.5,
                textTransform: 'none',
                ...(showNotes ? {
                  background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
                } : {}),
              }}
            >
              <NoteOutlinedIcon sx={{ fontSize: 15 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5, fontSize: 12 }}>
                Notes{showNotes ? '' : ''}
              </Box>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {showNotes ? <ExpandLessIcon sx={{ fontSize: 13, ml: 0.25 }} /> : <ExpandMoreIcon sx={{ fontSize: 13, ml: 0.25 }} />}
              </Box>
            </Button>
          </Tooltip>
        </Box>
      </Box>
      {showNotes && <NotesPanel appt={appt} token={token} />}
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
      let endpoint;
      if (apptType === 'scheduled') {
        endpoint = ENDPOINTS.APPOINTMENTS_SCHEDULED_LIST(100) + `&category_id=${category.id}&status=${statusFilter}`;
      } else {
        endpoint = ENDPOINTS.APPOINTMENTS_UNSCHEDULED_LIST(100) + `&category_id=${category.id}&status=${statusFilter}`;
      }
      const data = await apiCall(endpoint);
      let appts = data.results || [];
      
      // Fetch all pages if there are more results
      let nextUrl = data.next;
      while (nextUrl) {
        const pageData = await apiCall(nextUrl);
        appts = appts.concat(pageData.results || []);
        nextUrl = pageData.next;
      }
      
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
    } catch (err) {
      // Map certain backend validation errors to friendly UI guidance.
      let friendly = err.message || 'Failed to load appointments.';
      try {
        const body = err.body || {};
        const msg = (err.message || '').toLowerCase();
        // If the API complains about category_id (invalid or inactive), show actionable guidance
        if (body && (body.category_id || body.category || msg.includes('category_id') || msg.includes('one or more category ids are invalid') || msg.includes('invalid category'))) {
          friendly = 'This category appears inactive or invalid. Turn the category to Active to view appointments.';
        }
      } catch (e) {
        // ignore
      }
      // If this is a category-related error, clear the appointments list in the UI
      try {
        const body = err.body || {};
        const msg = (err.message || '').toLowerCase();
        if (body && (body.category_id || body.category || msg.includes('category_id') || msg.includes('one or more category ids are invalid') || msg.includes('invalid category'))) {
          setAppointments([]);
          setAvailableDates([]);
        }
      } catch (e) {
        // ignore
      }
      setError(friendly);
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
      if (action === 'checkin') {
        await apiCall(ENDPOINTS.APPOINTMENT_CHECKIN(appt.id), {
          method: 'POST',
        });
      } else if (action === 'checkout') {
        // Use dedicated checkout endpoint — records checkout_time, no counter adjustment
        await apiCall(ENDPOINTS.APPOINTMENT_CHECKOUT(appt.id), {
          method: 'POST',
        });
      } else if (action === 'cancel') {
        await apiCall(ENDPOINTS.APPOINTMENT_CANCEL(appt.id), {
          method: 'POST',
        });
      } else if (action === 'move-up') {
        const previous = index >= 2 ? appointments[index - 2] : null;
        await apiCall(ENDPOINTS.APPOINTMENT_MOVE(appt.id), {
          method: 'POST',
          body: JSON.stringify({ previous_appointment_id: previous ? previous.id : null }),
        });
      } else if (action === 'move-down') {
        const previous = appointments[index + 1];
        await apiCall(ENDPOINTS.APPOINTMENT_MOVE(appt.id), {
          method: 'POST',
          body: JSON.stringify({ previous_appointment_id: previous ? previous.id : null }),
        });
      }
      
      // Handle move animations
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
                  const dx = dy > 0 ? 6 : -6;
                  el.style.transform = `translateY(${dy}px) translateX(${dx}px)`;
                  el.style.opacity = '0.92';
                    el.getBoundingClientRect();
                    el.style.transition = 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 420ms ease';
                    requestAnimationFrame(() => {
                      el.style.transform = '';
                      el.style.opacity = '';
                    });
                    setTimeout(() => { if (el) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; } }, 480);
                  }
                });
              });
            }
          }

          showToast('↕️ Queue updated');
        } else {
          const toastMsg =
            action === 'checkin'  ? '✅ Checked in' :
            action === 'checkout' ? '🏁 Checked out' :
            action === 'cancel'   ? '❌ Cancelled' : 'Done';

          // Animate the card: slide right + fade out, then remove from list
          const el = itemRefs.current && itemRefs.current[appt.id];
          const DURATION = 380;
          if (el) {
            el.style.transition = `transform ${DURATION}ms cubic-bezier(0.4,0,1,1), opacity ${DURATION}ms ease, max-height ${DURATION}ms ease, margin ${DURATION}ms ease`;
            el.style.transform = 'translateX(60px)';
            el.style.opacity = '0';
            el.style.maxHeight = el.offsetHeight + 'px';
            el.style.overflow = 'hidden';
            // After slide-out, collapse height to zero so space closes smoothly
            setTimeout(() => {
              if (el) {
                el.style.maxHeight = '0';
                el.style.marginBottom = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
              }
            }, DURATION - 20);
            setTimeout(() => {
              setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
            }, DURATION + 80);
          } else {
            // No DOM ref — just remove immediately
            setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
          }

          showToast(toastMsg);
        }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
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
                token={token}
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

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console so developer can inspect stacktrace in browser
    // In production you may send this to an error-tracking service
    // eslint-disable-next-line no-console
    console.error('AdminPage render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>Something went wrong while rendering the admin page.</Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>Reload</Button>
        </Box>
      );
    }
    return this.props.children;
  }
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
  const [refreshCategoriesKey, setRefreshCategoriesKey] = useState(0);

  // Delete confirmation dialog state (replace native confirm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create category dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const makeEmptyHours = () => {
    const o = {};
    DAYS_OF_WEEK.forEach((d) => { o[d] = []; });
    return o;
  };
  const [createForm, setCreateForm] = useState({ name: '', description: '', type: 'general', is_scheduled: false, time_interval_per_appointment: 15, estimated_time: '', address_line1: '', address_line2: '', pincode: '', phone_number: '', opening_hours: makeEmptyHours(), break_hours: makeEmptyHours() });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  // Refs for create form inputs so we can focus the first invalid field
  const createNameRef = useRef(null);
  const createDescriptionRef = useRef(null);
  const createEstimatedRef = useRef(null);
  const createPhoneRef = useRef(null);
  const createAddress1Ref = useRef(null);
  const createPincodeRef = useRef(null);

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateForm({ name: '', description: '', type: 'general', is_scheduled: false, estimated_time: '', address_line1: '', address_line2: '', pincode: '', phone_number: '', opening_hours: makeEmptyHours(), break_hours: makeEmptyHours() });
    setCreateError('');
    setCreateFieldErrors({});
    setCreateLoading(false);
    setCreateDayErrors({});
  };

  // Create Category Admin (org-scoped) dialog state
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ first_name: '', last_name: '', email: '', phone: '', category_ids: [] });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserFieldErrors, setCreateUserFieldErrors] = useState({});
  // Refs for create/update category-admin user dialog
  const createUserFirstNameRef = useRef(null);
  const createUserEmailRef = useRef(null);
  const createUserPhoneRef = useRef(null);
  const createUserCategoryRef = useRef(null);
  const [categoryAdmins, setCategoryAdmins] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);

  const closeCreateUserDialog = () => {
    setCreateUserDialogOpen(false);
    setCreateUserForm({ first_name: '', last_name: '', email: '', phone: '', category_ids: [] });
    setCreateUserError('');
    setCreateUserLoading(false);
    setEditingUserId(null);
    setCreateUserFieldErrors({});
  };

  // Edit category dialog state
  const [editCatDialogOpen, setEditCatDialogOpen] = useState(false);
  const [editCatTarget, setEditCatTarget] = useState(null);
  const [editCatForm, setEditCatForm] = useState({ name: '', description: '', type: 'general', is_scheduled: false, time_interval_per_appointment: 15, estimated_time: '', address_line1: '', address_line2: '', pincode: '', phone_number: '', max_advance_days: 7, max_scheduled_per_user_per_day: '', time_zone: 'UTC', opening_hours: (function(){ const o={}; DAYS_OF_WEEK.forEach(d=>o[d]=[]); return o; })(), break_hours: (function(){ const o={}; DAYS_OF_WEEK.forEach(d=>o[d]=[]); return o; })() });
  const [editCatLoading, setEditCatLoading] = useState(false);
  const [editCatError, setEditCatError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState({});
  // Refs for edit form inputs to focus on first invalid field after server validation
  const editNameRef = useRef(null);
  const editDescriptionRef = useRef(null);
  const editEstimatedRef = useRef(null);
  const editPhoneRef = useRef(null);
  const editAddress1Ref = useRef(null);
  const editPincodeRef = useRef(null);
  const editMaxAdvanceRef = useRef(null);
  const editMaxPerDayRef = useRef(null);
  const editTimezoneRef = useRef(null);

  // unscheduled counts per category (for queue size display)
  const [unscheduledCounts, setUnscheduledCounts] = useState({});
  // preview of queue shown in the Add-to-queue modal (count + first few users)
  const [queuePreview, setQueuePreview] = useState({ count: 0, items: [] });
  // per-day inline validation errors for create/edit forms
  const [createDayErrors, setCreateDayErrors] = useState({});
  const [editDayErrors, setEditDayErrors] = useState({});
  // available slot interval options (minutes) populated from DB (plus sensible defaults)
  const [intervalOptions, setIntervalOptions] = useState([10, 15, 30, 60, 120]);

  // helpers for opening/break hours validation
  const timeToMinutes = (t) => {
    if (!t || typeof t !== 'string') return null;
    const parts = t.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  // Parse various representations of the category interval into minutes.
  // Accepts number (minutes), strings like '15', '00:15:00' or '1:00:00', or null.
  const intervalToMinutes = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
    if (typeof v === 'string') {
      // pure numeric string
      if (/^\d+$/.test(v)) return Number(v);
      // HH:MM:SS or H:MM:SS
      const parts = v.split(':').map((p) => p.replace(/^0+/, '') === '' ? '0' : p);
      if (parts.length >= 2) {
        const h = Number(parts[0]) || 0;
        const m = Number(parts[1]) || 0;
        if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
      }
      // fallback: try parseInt
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  };

  // Convert minutes (integer) to a Django-compatible DurationField string 'HH:MM:SS'.
  // Django DurationField requires a duration string; sending a bare integer causes it
  // to be interpreted as seconds instead of minutes, resulting in 0-minute slots.
  const minutesToDuration = (mins) => {
    const m = Number(mins);
    if (!Number.isFinite(m) || m <= 0) return '00:15:00'; // safe default
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${String(h).padStart(2, '0')}:${String(rem).padStart(2, '0')}:00`;
  };

  const formatIntervalLabel = (m) => {
    if (!m && m !== 0) return '';
    if (m >= 60) {
      if (m % 60 === 0) {
        const h = m / 60;
        return h === 1 ? '1 hour' : `${h} hours`;
      }
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return `${h}h ${rem}m`;
    }
    return `${m} minutes`;
  };

  const validateHours = (opening_hours, break_hours) => {
    // Return either null for no errors or an object { message, dayErrors }
    const dayErrors = {};
    for (const day of DAYS_OF_WEEK) {
      const opening = opening_hours[day] || [];
      if (!Array.isArray(opening)) {
        dayErrors[day] = `Opening hours for ${day} must be an array.`; continue;
      }
      if (opening.length === 0) continue; // closed is allowed
      if (opening.length !== 1) { dayErrors[day] = `Opening hours for ${day} must have one range.`; continue; }
      const [start, end] = opening[0] || [];
      const s = timeToMinutes(start);
      const e = timeToMinutes(end);
      if (s === null || e === null) { dayErrors[day] = `Invalid opening time format.`; continue; }
      if (s >= e) { dayErrors[day] = `Start must be earlier than end.`; continue; }

      const breaks = (break_hours && break_hours[day]) || [];
      for (const br of breaks) {
        const [bs, be] = br || [];
        const bsi = timeToMinutes(bs);
        const bei = timeToMinutes(be);
        if (bsi === null || bei === null) { dayErrors[day] = `Invalid break time format.`; break; }
        if (bsi >= bei) { dayErrors[day] = `Break start must be earlier than break end.`; break; }
        if (!(s <= bsi && bei <= e && bsi < bei)) { dayErrors[day] = `Break must be within opening hours.`; break; }
        if (bsi === s && bei === e) { dayErrors[day] = `Break cannot fully overlap opening hours.`; break; }
      }
    }
    const hasDays = Object.keys(dayErrors).length > 0;
    if (hasDays) return { message: 'Please fix the highlighted times.', dayErrors };
    return null;
  };

  // Helper: convert 'HH:MM' to 12-hour parts { display: 'h:mm', period: 'AM'|'PM' }
  const to12Hour = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return { display: '12:00', period: 'AM' };
    const parts = hhmm.split(':');
    if (parts.length !== 2) return { display: '12:00', period: 'AM' };
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    const display = `${h.toString().padStart(2, '0')}:${m}`;
    return { display, period };
  };

  // Helper: convert 12-hour display + period into 'HH:MM' 24-hour string
  const from12Hour = (display, period) => {
    if (!display || typeof display !== 'string') return '00:00';
    const parts = display.split(':');
    if (parts.length !== 2) return '00:00';
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    if (Number.isNaN(h)) h = 0;
    if (period === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  // Render a nicer composite time input: 12-hour display + AM/PM select
  function TimeInput({ value24, onChange, label, sx = {} }) {
    // value24: 'HH:MM'
    const { display, period } = to12Hour(value24 || '09:00');
    const [hour, minute] = (display || '09:00').split(':');
    const [h, setH] = useState(hour.replace(/^0/, '') || '9');
    const [m, setM] = useState((minute && minute.padStart(2, '0')) || '00');
    const [per, setPer] = useState(period);

    useEffect(() => {
      const d = to12Hour(value24 || '09:00');
      const parts = (d.display || '09:00').split(':');
      setH(parts[0].replace(/^0/, ''));
      setM(parts[1]);
      setPer(d.period);
    }, [value24]);

    const hours = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
    const minuteOptions = ['00', '15', '30', '45'];

    const commit = (nh, nm, np) => {
      const disp = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
      const next = from12Hour(disp, np);
      onChange && onChange(next);
    };

    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ...sx }}>
        <FormControl size="small" sx={{ minWidth: 56, '& .MuiSelect-select': { px: 1, py: 0.5, textAlign: 'center' }, '& .MuiOutlinedInput-notchedOutline': { borderRadius: 8 } }}>
          <Select value={String(h)} onChange={(e) => { const v = e.target.value; setH(v); commit(v, m, per); }}>
            {hours.map((hr) => <MenuItem key={hr} value={hr}>{hr}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 56, '& .MuiSelect-select': { px: 1, py: 0.5, textAlign: 'center' }, '& .MuiOutlinedInput-notchedOutline': { borderRadius: 8 } }}>
          <Select value={String(m)} onChange={(e) => { const v = e.target.value; setM(v); commit(h, v, per); }}>
            {minuteOptions.map((mm) => <MenuItem key={mm} value={mm}>{mm}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 64, '& .MuiSelect-select': { px: 1, py: 0.5, textAlign: 'center' }, '& .MuiOutlinedInput-notchedOutline': { borderRadius: 8 } }}>
          <Select value={per} onChange={(e) => { const v = e.target.value; setPer(v); commit(h, m, v); }}>
            <MenuItem value="AM">AM</MenuItem>
            <MenuItem value="PM">PM</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  }

  const toggleDayOpenCreate = (day, openFlag) => {
    setCreateForm((prev) => {
      const oh = { ...(prev.opening_hours || {}) };
      const bh = { ...(prev.break_hours || {}) };
      if (!openFlag) {
        oh[day] = [];
        bh[day] = [];
      } else {
        oh[day] = [['09:00', '17:00']];
        bh[day] = [];
      }
      return { ...prev, opening_hours: oh, break_hours: bh };
    });
    // clear any per-day errors for this day when toggling
    setCreateDayErrors((prev) => { const next = { ...(prev || {}) }; delete next[day]; return next; });
  };

  const toggleDayOpenEdit = (day, openFlag) => {
    setEditCatForm((prev) => {
      const oh = { ...(prev.opening_hours || {}) };
      const bh = { ...(prev.break_hours || {}) };
      if (!openFlag) {
        oh[day] = [];
        bh[day] = [];
      } else {
        oh[day] = [['09:00', '17:00']];
        bh[day] = [];
      }
      return { ...prev, opening_hours: oh, break_hours: bh };
    });
    setEditDayErrors((prev) => { const next = { ...(prev || {}) }; delete next[day]; return next; });
  };

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManageOrg = useCallback((orgId) => {
    const isStaffFlag = localStorage.getItem('isStaff') === 'true';
    if (isStaffFlag) return true;
    const isOrgAdminFlag = localStorage.getItem('isOrgAdmin') === 'true';
    if (!isOrgAdminFlag) return false;
    try {
      const access = JSON.parse(localStorage.getItem('orgAccess') || '[]');
      return access && access.findIndex((x) => String(x) === String(orgId)) !== -1;
    } catch (e) {
      return false;
    }
  }, []);

  const token = localStorage.getItem('accessToken');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isStaff = localStorage.getItem('isStaff') === 'true';
  const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';

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
          // If the user is an org-admin (no group membership) and categories were empty,
          // fetch org-scoped categories so org-admins see categories for their org_access.
          try {
            const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';
            if (isOrgAdmin) {
              const raw = localStorage.getItem('orgAccess') || '[]';
              const access = JSON.parse(raw);
              if (Array.isArray(access) && access.length > 0) {
                // Fetch categories for each org in access and append any missing ones
                for (const orgId of access) {
                  const orgCatRes = await fetch(`${API_BASE}/organizations/${orgId}/categories/`, { headers: authHeaders });
                  if (orgCatRes.ok) {
                    const orgCatData = await orgCatRes.json();
                    const orgCats = orgCatData.results || [];
                    // no-op for admins here; admins are fetched via the dedicated /admins/ endpoint per org
                    // Append categories that aren't already present (by id)
                    const existingIds = new Set((data.results || []).map((c) => c.id).concat((categories || []).map((c) => c.id)));
                    for (const c of orgCats) {
                      if (!existingIds.has(c.id)) {
                        setCategories((prev) => [...prev, c]);
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            // ignore parsing/fetch errors
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

  // Re-fetch categories when refreshCategoriesKey increments
  useEffect(() => {
    // reuse the same fetch logic by toggling the dependency above -- simple approach: call fetch by forcing the outer effect
    // easiest: reload page data by calling window.dispatchEvent to trigger same fetch; to keep it local, just call the inner logic by reusing the effect
    // We'll trigger a small hack: call the same endpoint here to refresh organizations and categories when key changes.
    const doRefresh = async () => {
      try {
        const endpoint = isStaff
          ? `${API_BASE}/categories/?page_size=100`
          : `${API_BASE}/categories/user/?page_size=100`;
        const res = await fetch(endpoint, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          setCategories(data.results || []);
        }
        const orgRes = await fetch(`${API_BASE}/organizations/?page_size=100`, { headers: authHeaders });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganizations(orgData.results || []);
        }
        // For org-admins: also re-fetch the org-scoped categories so the list isn't wiped
        const isOrgAdminFlag = localStorage.getItem('isOrgAdmin') === 'true';
        if (isOrgAdminFlag) {
          const raw = localStorage.getItem('orgAccess') || '[]';
          let access = [];
          try { access = JSON.parse(raw); } catch (e) { /* ignore */ }
          if (Array.isArray(access) && access.length > 0) {
            const allOrgCats = [];
            for (const orgId of access) {
              const r = await fetch(`${API_BASE}/organizations/${orgId}/categories/`, { headers: authHeaders });
              if (r.ok) {
                const d = await r.json();
                (d.results || []).forEach((c) => allOrgCats.push(c));
              }
            }
            if (allOrgCats.length > 0) {
              // Merge with any already-fetched categories, deduplicating by id
              setCategories((prev) => {
                const byId = {};
                (prev || []).forEach((c) => { byId[c.id] = c; });
                allOrgCats.forEach((c) => { byId[c.id] = c; });
                return Object.values(byId);
              });
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };
    if (refreshCategoriesKey > 0) doRefresh();
  }, [refreshCategoriesKey]);

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

  const handleCreateCategory = async () => {
    setCreateError('');
    setCreateLoading(true);
    try {
      // validate scheduled hours if enabled
      if (createForm.is_scheduled) {
        const v = validateHours(createForm.opening_hours || {}, createForm.break_hours || {});
        if (v) {
          if (v.dayErrors) setCreateDayErrors(v.dayErrors);
          setCreateError(v.message || v);
          setCreateLoading(false);
          return;
        } else {
          setCreateDayErrors({});
        }
      }
      const payload = {
        ...createForm,
        organization: currentOrg && currentOrg.id,
        // Convert minutes integer to HH:MM:SS duration string for Django DurationField
        time_interval_per_appointment: minutesToDuration(createForm.time_interval_per_appointment),
      };
      const res = await fetch(`${API_BASE}/categories/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCreateDialogOpen(false);
  setCreateForm({ name: '', description: '', type: 'general', is_scheduled: false, estimated_time: '', address_line1: '', address_line2: '', pincode: '', phone_number: '', opening_hours: makeEmptyHours(), break_hours: makeEmptyHours() });
        setCreateDayErrors({});
        setToast({ open: true, msg: 'Category created', severity: 'success' });
        setRefreshCategoriesKey((k) => k + 1);
      } else {
          const err = await res.json().catch(() => ({}));
          console.error('Create category failed', res.status, err); // eslint-disable-line no-console
          // If the API returned field-level validation errors, attach them to the form
          const fieldErrs = {};
          if (err && typeof err === 'object') {
            const src = err.errors && typeof err.errors === 'object' ? err.errors : err;
            for (const [k, v] of Object.entries(src)) {
              if (typeof k === 'string') {
                const msg = Array.isArray(v) ? v.join(' ') : String(v);
                fieldErrs[k] = msg;
              }
            }
          }
          if (Object.keys(fieldErrs).length > 0) {
            setCreateFieldErrors(fieldErrs);
            setCreateError('Please correct the highlighted fields.');
            // Focus the first invalid create field (in a predictable order)
            (function focusFirstCreateField() {
              const order = ['name', 'description', 'estimated_time', 'address_line1', 'pincode', 'phone_number'];
              for (const k of order) {
                if (fieldErrs[k]) {
                  try {
                    if (k === 'name' && createNameRef.current) { createNameRef.current.focus(); return; }
                    if (k === 'description' && createDescriptionRef.current) { createDescriptionRef.current.focus(); return; }
                    if (k === 'estimated_time' && createEstimatedRef.current) { createEstimatedRef.current.focus(); return; }
                    if (k === 'address_line1' && createAddress1Ref.current) { createAddress1Ref.current.focus(); return; }
                    if (k === 'pincode' && createPincodeRef.current) { createPincodeRef.current.focus(); return; }
                    if (k === 'phone_number' && createPhoneRef.current) { createPhoneRef.current.focus(); return; }
                  } catch (_) { /* ignore focus failures */ }
                }
              }
            })();
          } else {
            setCreateError(parseApiError(err, 'Failed to create category'));
          }
      }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Create category exception', e);
        setCreateError('Network error');
    }
    setCreateLoading(false);
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/categories/${deleteTarget.id}/`, { method: 'DELETE', headers: authHeaders });
      if (res.ok || res.status === 204) {
        setToast({ open: true, msg: 'Category deleted', severity: 'success' });
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setRefreshCategoriesKey((k) => k + 1);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ open: true, msg: err.detail || 'Failed to delete category', severity: 'error' });
      }
    } catch (e) {
      setToast({ open: true, msg: 'Network error', severity: 'error' });
    }
  };

  const handleOpenEditCat = (cat) => {
    setEditCatTarget(cat);
    setEditCatForm({
      name: cat.name || '',
      description: cat.description || '',
      type: cat.type || 'general',
      is_scheduled: !!cat.is_scheduled,
      time_interval_per_appointment: (intervalToMinutes(cat.time_interval_per_appointment) || 15),
      estimated_time: cat.estimated_time != null ? String(cat.estimated_time) : '',
      address_line1: cat.address_line1 || '',
      address_line2: cat.address_line2 || '',
      pincode: cat.pincode || '',
      phone_number: cat.phone_number || '',
      max_advance_days: cat.max_advance_days != null ? cat.max_advance_days : 7,
      max_scheduled_per_user_per_day: cat.max_scheduled_per_user_per_day != null ? String(cat.max_scheduled_per_user_per_day) : '',
      time_zone: cat.time_zone || 'UTC',
      opening_hours: cat.opening_hours || (function(){ const o={}; DAYS_OF_WEEK.forEach(d=>o[d]=[]); return o; })(),
      break_hours: cat.break_hours || (function(){ const o={}; DAYS_OF_WEEK.forEach(d=>o[d]=[]); return o; })(),
    });
    setEditCatError('');
    setEditFieldErrors({});
    setEditDayErrors({});
    setEditCatDialogOpen(true);
  };

  const handleEditCategory = async () => {
    if (!editCatTarget) return;
    setEditCatLoading(true);
    setEditCatError('');
    // validate scheduled hours if enabled
    if (editCatForm.is_scheduled) {
      const v = validateHours(editCatForm.opening_hours || {}, editCatForm.break_hours || {});
      if (v) {
        if (v.dayErrors) setEditDayErrors(v.dayErrors);
        setEditCatError(v.message || v);
        setEditCatLoading(false);
        return;
      } else {
        setEditDayErrors({});
      }
    }
    try {
      const editPayload = {
        ...editCatForm,
        // Convert minutes integer to HH:MM:SS duration string for Django DurationField
        time_interval_per_appointment: minutesToDuration(editCatForm.time_interval_per_appointment),
        // Cast numeric fields — send null if blank
        max_advance_days: editCatForm.max_advance_days !== '' ? Number(editCatForm.max_advance_days) : 7,
        max_scheduled_per_user_per_day: editCatForm.max_scheduled_per_user_per_day !== '' ? Number(editCatForm.max_scheduled_per_user_per_day) : null,
        estimated_time: editCatForm.estimated_time !== '' ? Number(editCatForm.estimated_time) : null,
      };
      const res = await fetch(`${API_BASE}/categories/${editCatTarget.id}/update-info/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(editPayload),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        // Update the category in local state directly — avoids triggering a full re-fetch
        // which would wipe org-admin categories (they come from /organizations/{id}/categories/).
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id !== editCatTarget.id) return c;
            // Merge the returned data with local edits as fallback
            return updated ? { ...c, ...updated } : { ...c, ...editCatForm };
          })
        );
        setEditCatDialogOpen(false);
        setEditCatTarget(null);
        setEditDayErrors({});
        setToast({ open: true, msg: 'Category updated', severity: 'success' });
      } else {
        const err = await res.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.error('Edit category failed', res.status, err); // eslint-disable-line no-console
        // Handle field-level validation errors specially so fields can show helperText
        const fieldErrs = {};
        if (err && typeof err === 'object') {
          const src = err.errors && typeof err.errors === 'object' ? err.errors : err;
          for (const [k, v] of Object.entries(src)) {
            if (typeof k === 'string') {
              const msg = Array.isArray(v) ? v.join(' ') : String(v);
              fieldErrs[k] = msg;
            }
          }
        }
        if (Object.keys(fieldErrs).length > 0) {
          setEditFieldErrors(fieldErrs);
          setEditCatError('Please correct the highlighted fields.');
          // Focus the first invalid edit field
          (function focusFirstEditField() {
            const order = ['name', 'description', 'estimated_time', 'phone_number', 'address_line1', 'pincode', 'max_advance_days', 'max_scheduled_per_user_per_day', 'time_zone'];
            for (const k of order) {
              if (fieldErrs[k]) {
                try {
                  if (k === 'name' && editNameRef.current) { editNameRef.current.focus(); return; }
                  if (k === 'description' && editDescriptionRef.current) { editDescriptionRef.current.focus(); return; }
                  if (k === 'estimated_time' && editEstimatedRef.current) { editEstimatedRef.current.focus(); return; }
                  if (k === 'phone_number' && editPhoneRef.current) { editPhoneRef.current.focus(); return; }
                  if (k === 'address_line1' && editAddress1Ref.current) { editAddress1Ref.current.focus(); return; }
                  if (k === 'pincode' && editPincodeRef.current) { editPincodeRef.current.focus(); return; }
                  if (k === 'max_advance_days' && editMaxAdvanceRef.current) { editMaxAdvanceRef.current.focus(); return; }
                  if (k === 'max_scheduled_per_user_per_day' && editMaxPerDayRef.current) { editMaxPerDayRef.current.focus(); return; }
                  if (k === 'time_zone' && editTimezoneRef.current) { editTimezoneRef.current.focus(); return; }
                } catch (_) { /* ignore focus failures */ }
              }
            }
          })();
        } else {
          setEditCatError(parseApiError(err, 'Failed to update category'));
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Edit category exception', e);
      setEditCatError('Network error');
    }
    setEditCatLoading(false);
  };

  // Create a category-scoped admin user for the current organization
  const handleCreateCategoryUser = async () => {
    setCreateUserError('');
    setCreateUserFieldErrors({});
    setCreateUserLoading(true);
    try {
      // basic validation
      const errs = {};
  if (!createUserForm.first_name || createUserForm.first_name.trim().length === 0) errs.first_name = 'First name required';
  // phone is optional for admin users
  if (!Array.isArray(createUserForm.category_ids) || createUserForm.category_ids.length === 0) errs.category_ids = 'Select at least one category';
      if (Object.keys(errs).length > 0) {
        setCreateUserError(Object.values(errs).join(' | '));
        setCreateUserLoading(false);
        return;
      }

      // normalize phone only if provided (phone is optional)
      let payload = {
        first_name: createUserForm.first_name.trim(),
        last_name: createUserForm.last_name ? createUserForm.last_name.trim() : '',
        email: createUserForm.email ? createUserForm.email.trim() : '',
        category_ids: createUserForm.category_ids,
      };
      if (createUserForm.phone && String(createUserForm.phone).trim().length > 0) {
        let phone = (createUserForm.phone || '').trim();
        if (!phone.startsWith('+')) {
          // try to prefix with default country dial
          const dial = selectedCountry && selectedCountry.dial ? selectedCountry.dial : COUNTRIES[0].dial;
          const digits = phone.replace(/\D/g, '');
          phone = `${dial}${digits}`;
          if (!phone.startsWith('+')) phone = `+${phone.replace(/^\+?/, '')}`;
        }
        payload.phone = phone;
      }

      // Organization id must be present
      const orgId = currentOrg && currentOrg.id;
      if (!orgId) {
        setCreateUserError('Organization not selected');
        setCreateUserLoading(false);
        return;
      }

      // If editingUserId set, call update endpoint
      let endpoint = `${API_BASE}/organizations/${orgId}/create-category-user/`;
      if (editingUserId) {
        endpoint = `${API_BASE}/organizations/${orgId}/update-category-user/`;
      }

      const body = editingUserId ? { ...payload, user_id: editingUserId } : payload;
      const res = await fetch(endpoint, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(body),
      });
      if (res.ok) {
        closeCreateUserDialog();
        setToast({ open: true, msg: editingUserId ? 'Category admin updated' : 'Category admin created', severity: 'success' });
        setRefreshCategoriesKey((k) => k + 1);
        // refresh admins list from dedicated endpoint
        try {
          const ares = await fetch(`${API_BASE}/organizations/${orgId}/admins/`, { headers: authHeaders });
          if (ares.ok) {
            const adata = await ares.json();
            if (adata.admins) setCategoryAdmins(adata.admins || []);
          }
        } catch (e) {
          // ignore
        }
      } else {
        const err = await res.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.error('Create/update category user failed', res.status, err); // eslint-disable-line no-console
        // Check for field-level validation errors
        const fieldErrs = {};
        if (err && typeof err === 'object') {
          const src = err.errors && typeof err.errors === 'object' ? err.errors : err;
          for (const [k, v] of Object.entries(src)) {
            if (typeof k === 'string') {
              const msg = Array.isArray(v) ? v.join(' ') : String(v);
              fieldErrs[k] = msg;
            }
          }
        }
        if (Object.keys(fieldErrs).length > 0) {
          setCreateUserFieldErrors(fieldErrs);
          setCreateUserError('Please correct the highlighted fields.');
          // Focus first invalid create-user field
          (function focusFirstCreateUserField() {
            const order = ['first_name', 'email', 'phone', 'category_ids'];
            for (const k of order) {
              if (fieldErrs[k]) {
                try {
                  if (k === 'first_name' && createUserFirstNameRef.current) { createUserFirstNameRef.current.focus(); return; }
                  if (k === 'email' && createUserEmailRef.current) { createUserEmailRef.current.focus(); return; }
                  if (k === 'phone' && createUserPhoneRef.current) { createUserPhoneRef.current.focus(); return; }
                  if (k === 'category_ids' && createUserCategoryRef.current) { if (createUserCategoryRef.current.focus) createUserCategoryRef.current.focus(); return; }
                } catch (_) { /* ignore */ }
              }
            }
          })();
        } else {
          setCreateUserError(parseApiError(err, 'Failed to create/update user'));
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Create category user exception', e);
      setCreateUserError('Network error');
    }
    setCreateUserLoading(false);
  };

  const handleOpenEditUser = (user) => {
    try {
      // prefer to split stored E.164 phone into country + local number for editing
      // Try several possible phone fields returned by the API (be defensive)
      let phoneRaw = '';
      if (user) {
        if (user.phone) phoneRaw = user.phone;
        else if (user.phone_number) phoneRaw = user.phone_number;
        else {
          // fallback: pick any key that contains 'phone'
          for (const k of Object.keys(user)) {
            if (k.toLowerCase().includes('phone') && user[k]) {
              phoneRaw = user[k];
              break;
            }
          }
        }
      }
      let digits = (phoneRaw + '').replace(/\D/g, '');
      let matched = null;
      for (const c of COUNTRIES) {
        const cd = (c.dial || '').replace(/\D/g, '');
        if (cd && digits.startsWith(cd)) {
          matched = { country: c, local: digits.slice(cd.length) };
          break;
        }
      }
      if (matched) {
        setSelectedCountry(matched.country);
        setCreateUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '', phone: matched.local || '', category_ids: user.category_ids || [] });
      } else {
        // fallback: keep full digits in phone field
        setCreateUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '', phone: phoneRaw || '', category_ids: user.category_ids || [] });
      }
      setEditingUserId(user.id);
      setCreateUserDialogOpen(true);
    } catch (e) {
      // defensive fallback
      setEditingUserId(user.id);
      setCreateUserForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '', phone: user.phone || '', category_ids: user.category_ids || [] });
      setCreateUserDialogOpen(true);
    }
  };

  const handleDeleteCategoryUser = async (userId) => {
    // Open app-styled confirmation dialog instead of native confirm()
    if (!userId) return;
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const performDeleteCategoryUser = async () => {
    const userId = userToDelete;
    if (!userId) return;
    const orgId = currentOrg && currentOrg.id;
    if (!orgId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/delete-category-user/`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        setToast({ open: true, msg: 'User deleted', severity: 'success' });
        setRefreshCategoriesKey((k) => k + 1);
        // refresh admins
        try {
          const ares = await fetch(`${API_BASE}/organizations/${orgId}/admins/`, { headers: authHeaders });
          if (ares.ok) {
            const adata = await ares.json();
            if (adata.admins) setCategoryAdmins(adata.admins || []);
          }
        } catch (e) {
          // ignore admin refresh errors
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ open: true, msg: err.detail || 'Failed to delete user', severity: 'error' });
      }
    } catch (e) {
      setToast({ open: true, msg: 'Network error', severity: 'error' });
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
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
        country_code: selectedCountry ? selectedCountry.code : 'IN',
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
        try {
          const err = await res.json();
          setQueueError(parseApiError(err, 'Failed to add user to queue'));
        } catch (e) {
          setQueueError('Failed to add user to queue');
        }
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

  // Fetch admins for the selected organization using the dedicated endpoint.
  useEffect(() => {
    let mounted = true;
    const fetchAdmins = async (orgId) => {
      try {
        const res = await fetch(`${API_BASE}/organizations/${orgId}/admins/`, { headers: authHeaders });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setCategoryAdmins(data.admins || []);
        } else {
          setCategoryAdmins([]);
        }
      } catch (e) {
        if (!mounted) return;
        setCategoryAdmins([]);
      }
    };

    if (currentOrg && currentOrg.id) {
      fetchAdmins(currentOrg.id);
    }

    return () => { mounted = false; };
  }, [currentOrg, refreshCategoriesKey]);

  // Populate slot-interval options from DB (categories on the selected org), keep sensible defaults
  useEffect(() => {
    const defaults = [10, 15, 30, 60, 120];
    if (!currentOrg) {
      setIntervalOptions(defaults);
      return;
    }
    const s = new Set(defaults);
    (currentOrg.categories || []).forEach((c) => {
      const mins = intervalToMinutes(c && c.time_interval_per_appointment);
      if (mins && Number.isFinite(mins)) s.add(mins);
    });
    const arr = Array.from(s).sort((a, b) => a - b);
    setIntervalOptions(arr);
  }, [currentOrg]);

  // Fetch unscheduled queue counts for visible categories so we can show 'N in queue'
  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      try {
        const map = {};
        for (const c of categories || []) {
          if (c && !c.is_scheduled) {
            try {
              const r = await fetch(`${API_BASE}/appointments/unscheduled-count/?category_id=${c.id}&status=active`, { headers: authHeaders });
              if (r.ok) {
                const d = await r.json();
                map[c.id] = d.count || 0;
              }
            } catch (e) {
              // ignore
            }
          }
        }
        if (mounted) setUnscheduledCounts((prev) => ({ ...prev, ...map }));
      } catch (e) {
        // ignore
      }
    };
    if (categories && categories.length > 0) fetchCounts();
    return () => { mounted = false; };
  }, [categories]);

  // When the Add-to-queue modal opens for a category, fetch a small preview
  // of the queue (count + first few users) so we can show "N people in front".
  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      if (!queueModalOpen || !queueModalCategory) return;
        try {
        const r = await fetch(`${API_BASE}/appointments/unscheduled-count/?category_id=${queueModalCategory.id}&status=active`, { headers: authHeaders });
        if (!mounted) return;
        if (r.ok) {
          const d = await r.json();
          setQueuePreview({ count: d.count || 0, items: [] });
        } else {
          setQueuePreview({ count: 0, items: [] });
        }
      } catch (e) {
        if (!mounted) return;
        setQueuePreview({ count: 0, items: [] });
      }
    };
    fetchPreview();
    return () => { mounted = false; };
  }, [queueModalOpen, queueModalCategory]);

  // If the logged-in user is an org-admin, default the org tab to the first org
  // in their org_access that has categories available in groupedOrgs.
  useEffect(() => {
    try {
      const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';
      if (!isOrgAdmin) return;
      const raw = localStorage.getItem('orgAccess') || '[]';
      const access = JSON.parse(raw);
      if (!Array.isArray(access) || access.length === 0) return;
      if (!groupedOrgs || groupedOrgs.length === 0) return;
      // Normalize ids to strings for robust comparison
      const accessSet = new Set((access || []).map((v) => String(v)));
      const idx = groupedOrgs.findIndex((o) => o.id !== null && accessSet.has(String(o.id)));
      if (idx !== -1 && idx !== orgIndex) {
        // Defer setState to avoid synchronous state updates inside effect which can cause cascading renders.
        // Using a macrotask ensures the effect finishes before state changes trigger a re-render.
        const t = setTimeout(() => setOrgIndex(idx), 0);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }, [groupedOrgs, orgIndex]);

  return (
    <AdminErrorBoundary>
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

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                  {currentOrg && canManageOrg(currentOrg.id) && (
                    <>
                      <Button variant="contained" size="small" onClick={() => { setCreateForm({ name: '', description: '', type: 'general', is_scheduled: false, estimated_time: '', address_line1: '', address_line2: '', pincode: '', phone_number: '', opening_hours: makeEmptyHours(), break_hours: makeEmptyHours() }); setCreateError(''); setCreateFieldErrors({}); setCreateDialogOpen(true); }} sx={{ borderRadius: 6, mr: 1 }}>
                        + New Category
                      </Button>
                      {isOrgAdmin && (
                        <Button variant="outlined" size="small" onClick={() => { setCreateUserDialogOpen(true); setCreateUserForm({ first_name: '', last_name: '', email: '', phone: '', category_ids: (currentOrg && currentOrg.categories && currentOrg.categories[0]) ? [currentOrg.categories[0].id] : [] }); }} sx={{ borderRadius: 6 }}>
                          + New Category Admin
                        </Button>
                      )}
                    </>
                  )}
                </Box>

                {/* Category tabs for the selected organization (hidden for org-admins because we show a list) */}
                {currentOrg && !isOrgAdmin && (
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

                {/* Create Category dialog */}
                <Dialog open={createDialogOpen} onClose={closeCreateDialog} fullWidth maxWidth="sm" TransitionComponent={Fade} transitionDuration={{ enter: 200, exit: 100 }}>
                  <DialogTitle>Create new category</DialogTitle>
                  <DialogContent>
                    {createError && <Alert severity="error" sx={{ mb: 1 }}>{createError}</Alert>}
                    <TextField
                      fullWidth
                      required
                      label="Name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      sx={{ mb: 2 }}
                      error={Boolean(createFieldErrors.name)}
                      helperText={createFieldErrors.name}
                      inputRef={createNameRef}
                    />
                    <TextField
                      fullWidth
                      label="Description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                      sx={{ mb: 2 }}
                      error={Boolean(createFieldErrors.description)}
                      helperText={createFieldErrors.description}
                      inputRef={createDescriptionRef}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Estimated time per person (minutes)"
                      type="number"
                      inputProps={{ min: 1 }}
                      value={createForm.estimated_time}
                      onChange={(e) => setCreateForm((f) => ({ ...f, estimated_time: e.target.value }))}
                      helperText={createFieldErrors.estimated_time || 'Used to show estimated wait time in the walk-in queue (e.g. 15)'}
                      error={Boolean(createFieldErrors.estimated_time)}
                      sx={{ mb: 2 }}
                      inputRef={createEstimatedRef}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Address line 1 (optional)"
                      value={createForm.address_line1}
                      onChange={(e) => setCreateForm((f) => ({ ...f, address_line1: e.target.value }))}
                      helperText={createFieldErrors.address_line1 || 'Street address specific to this service location'}
                      error={Boolean(createFieldErrors.address_line1)}
                      sx={{ mb: 2 }}
                      inputRef={createAddress1Ref}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Address line 2 (optional)"
                      value={createForm.address_line2}
                      onChange={(e) => setCreateForm((f) => ({ ...f, address_line2: e.target.value }))}
                      helperText={createFieldErrors.address_line2 || 'Floor, suite, landmark'}
                      error={Boolean(createFieldErrors.address_line2)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Pincode / ZIP (optional)"
                      value={createForm.pincode}
                      onChange={(e) => setCreateForm((f) => ({ ...f, pincode: e.target.value }))}
                      helperText={createFieldErrors.pincode || 'Postal / ZIP code'}
                      error={Boolean(createFieldErrors.pincode)}
                      sx={{ mb: 2 }}
                      inputRef={createPincodeRef}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Phone number (optional)"
                      value={createForm.phone_number}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone_number: e.target.value }))}
                      helperText={createFieldErrors.phone_number || 'E.164 format, e.g. +911234567890'}
                      error={Boolean(createFieldErrors.phone_number)}
                      sx={{ mb: 2 }}
                      inputRef={createPhoneRef}
                    />
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel id="cat-type-label">Type</InputLabel>
                      <Select labelId="cat-type-label" value={createForm.type} label="Type" onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}>
                        <MenuItem value="general">General</MenuItem>
                        <MenuItem value="inperson">In Person</MenuItem>
                        <MenuItem value="drive-thru">Drive-thru</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControlLabel control={<Switch checked={createForm.is_scheduled} onChange={(e) => setCreateForm((f) => ({ ...f, is_scheduled: e.target.checked }))} />} label="Scheduled appointments" />
                    {createForm.is_scheduled && (
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel id="create-interval-label">Slot interval</InputLabel>
                            <Select
                              labelId="create-interval-label"
                              value={createForm.time_interval_per_appointment || 15}
                              label="Slot interval"
                              onChange={(e) => setCreateForm((f) => ({ ...f, time_interval_per_appointment: Number(e.target.value) }))}
                            >
                              {intervalOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>{formatIntervalLabel(opt)}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Opening hours</Typography>
                        <Grid container spacing={1}>
                          {DAYS_OF_WEEK.map((day) => {
                            const opening = (createForm.opening_hours && createForm.opening_hours[day]) || [];
                            const isClosed = !opening || opening.length === 0;
                            const br = (createForm.break_hours && createForm.break_hours[day]) || [];
                            return (
                              <Grid item xs={12} sm={6} key={`open-${day}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 110 }}><Typography variant="body2">{day}</Typography></Box>
                                  <FormControlLabel
                                    control={<Switch size="small" checked={!isClosed} onChange={(e) => toggleDayOpenCreate(day, e.target.checked)} />}
                                    label={isClosed ? 'Closed' : 'Open'}
                                  />
                                </Box>
                                {!isClosed && (
                                  <Box sx={{ mt: 1 }}>
                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'flex-start' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Opening</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                          <TimeInput
                                            value24={opening[0] ? opening[0][0] : '09:00'}
                                            onChange={(val) => {
                                              setCreateForm((prev) => {
                                                const oh = { ...(prev.opening_hours || {}) };
                                                oh[day] = [[val, (oh[day] && oh[day][0] && oh[day][0][1]) || '17:00']];
                                                return { ...prev, opening_hours: oh };
                                              });
                                            }}
                                          />
                                          <TimeInput
                                            value24={opening[0] ? opening[0][1] : '17:00'}
                                            onChange={(val) => {
                                              setCreateForm((prev) => {
                                                const oh = { ...(prev.opening_hours || {}) };
                                                oh[day] = [[(oh[day] && oh[day][0] && oh[day][0][0]) || '09:00', val]];
                                                return { ...prev, opening_hours: oh };
                                              });
                                            }}
                                          />
                                        </Box>
                                      </Box>

                                      <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                                        <Button size="small" variant="text" fullWidth={window.innerWidth < 600} onClick={() => {
                                          setCreateForm((prev) => {
                                            const bh = { ...(prev.break_hours || {}) };
                                            if (bh[day] && bh[day].length > 0) bh[day] = [];
                                            else bh[day] = [['13:00','14:00']];
                                            return { ...prev, break_hours: bh };
                                          });
                                        }} sx={{ color: 'primary.main', textTransform: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>{br && br.length > 0 ? 'Remove break' : 'Add break'}</Button>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                {br && br.length > 0 && (
                                  <Box sx={{ mt: 1, pl: { xs: 0, sm: 1 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'flex-start' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ color: 'warning.dark' }}>Break</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: '#fff7e6', p: 0.5, borderRadius: 1 }}>
                                          <TimeInput
                                            value24={br[0][0]}
                                            onChange={(val) => {
                                              setCreateForm((prev) => {
                                                const bh = { ...(prev.break_hours || {}) };
                                                bh[day] = [[val, (bh[day] && bh[day][0] && bh[day][0][1]) || '14:00']];
                                                return { ...prev, break_hours: bh };
                                              });
                                            }}
                                          />
                                          <TimeInput
                                            value24={br[0][1]}
                                            onChange={(val) => {
                                              setCreateForm((prev) => {
                                                const bh = { ...(prev.break_hours || {}) };
                                                bh[day] = [[(bh[day] && bh[day][0] && bh[day][0][0]) || '13:00', val]];
                                                return { ...prev, break_hours: bh };
                                              });
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                {createDayErrors && createDayErrors[day] && (
                                  <FormHelperText error sx={{ mt: 0.5 }}>{createDayErrors[day]}</FormHelperText>
                                )}
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={closeCreateDialog}>Cancel</Button>
                    <Button onClick={handleCreateCategory} variant="contained" disabled={createLoading}>{createLoading ? <CircularProgress size={18} /> : 'Create'}</Button>
                  </DialogActions>
                </Dialog>

                {/* Create Category Admin (org-scoped) dialog */}
                <Dialog open={createUserDialogOpen} onClose={closeCreateUserDialog} fullWidth maxWidth="sm">
                  <DialogTitle>Create category admin</DialogTitle>
                  <DialogContent>
                    {createUserError && <Alert severity="error" sx={{ mb: 1 }}>{createUserError}</Alert>}
                    <Box component="form" sx={{ mt: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                              <TextField
                                required
                                size="small"
                                label="First name"
                                value={createUserForm.first_name}
                                onChange={(e) => setCreateUserForm((f) => ({ ...f, first_name: e.target.value }))}
                                fullWidth
                                error={Boolean(createUserFieldErrors.first_name)}
                                helperText={createUserFieldErrors.first_name}
                                inputRef={createUserFirstNameRef}
                              />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Last name"
                            value={createUserForm.last_name}
                            onChange={(e) => setCreateUserForm((f) => ({ ...f, last_name: e.target.value }))}
                            fullWidth
                            error={Boolean(createUserFieldErrors.last_name)}
                            helperText={createUserFieldErrors.last_name}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Email (optional)"
                            value={createUserForm.email}
                            onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
                            fullWidth
                            error={Boolean(createUserFieldErrors.email)}
                            helperText={createUserFieldErrors.email}
                            inputRef={createUserEmailRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Phone (optional)"
                            value={createUserForm.phone}
                            onChange={(e) => setCreateUserForm((f) => ({ ...f, phone: e.target.value }))}
                            fullWidth
                            error={Boolean(createUserFieldErrors.phone)}
                            helperText={createUserFieldErrors.phone || 'Include country code or use +prefix (optional)'}
                            inputRef={createUserPhoneRef}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start" sx={{ mr: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => setCountryAnchorEl(e.currentTarget)}
                                    sx={{ mr: 0, p: 0, minWidth: 36, display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <Typography sx={{ fontSize: 14 }}>{selectedCountry && selectedCountry.flag}</Typography>
                                    <Typography sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5 }}>{selectedCountry && selectedCountry.dial}</Typography>
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControl fullWidth size="small" error={Boolean(createUserFieldErrors.category_ids)}>
                            <InputLabel id="create-user-cat-label">Category</InputLabel>
                            <Select
                              labelId="create-user-cat-label"
                              multiple
                              value={createUserForm.category_ids || []}
                              label="Category"
                              onChange={(e) => setCreateUserForm((f) => ({ ...f, category_ids: e.target.value }))}
                              inputRef={createUserCategoryRef}
                              renderValue={(selected) => {
                                if (!selected || selected.length === 0) return 'Select categories';
                                const selIds = (selected || []).map((s) => (typeof s === 'string' && s.match(/^\d+$/) ? parseInt(s, 10) : s));
                                const names = (currentOrg && currentOrg.categories || []).filter((c) => selIds.includes(c.id)).map((c) => c.name || c.description || `#${c.id}`);
                                const visible = names.slice(0, 2);
                                const remaining = names.length - visible.length;
                                return (
                                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {visible.map((n) => <Chip key={n} label={n} size="small" sx={{ mr: 0.5 }} />)}
                                    {remaining > 0 && <Chip label={`+${remaining} more`} size="small" sx={{ bgcolor: 'transparent', color: 'text.secondary', border: '1px solid', borderColor: 'divider' }} />}
                                  </Box>
                                );
                              }}
                              MenuProps={{ PaperProps: { style: { maxHeight: 260 } } }}
                            >
                              {(currentOrg && currentOrg.categories || []).map((c) => (
                                <MenuItem key={`cu-${c.id}`} value={c.id}>
                                  <Checkbox checked={Array.isArray(createUserForm.category_ids) ? createUserForm.category_ids.map((s) => (typeof s === 'string' && s.match(/^\d+$/) ? parseInt(s, 10) : s)).includes(c.id) : false} />
                                  <ListItemText primary={c.name || c.description || `Category #${c.id}`} />
                                </MenuItem>
                              ))}
                            </Select>
                            {createUserFieldErrors.category_ids && (
                              <FormHelperText error sx={{ mt: 0.5 }}>{createUserFieldErrors.category_ids}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={closeCreateUserDialog} disabled={createUserLoading}>Cancel</Button>
                    <Button onClick={handleCreateCategoryUser} variant="contained" disabled={createUserLoading}>{createUserLoading ? <CircularProgress size={18} /> : (editingUserId ? 'Update' : 'Create')}</Button>
                  </DialogActions>
                </Dialog>

                {/* Delete confirmation dialog */}
                <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                  <DialogTitle>Delete category?</DialogTitle>
                  <DialogContent>
                    <Typography>Are you sure you want to permanently delete category "{deleteTarget && (deleteTarget.name || deleteTarget.description || `#${deleteTarget.id}`)}"?</Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteCategory}>Delete</Button>
                  </DialogActions>
                </Dialog>

                {/* Edit Category dialog */}
                <Dialog open={editCatDialogOpen} onClose={() => { 
                  setEditCatDialogOpen(false); 
                  setEditFieldErrors({}); 
                  setEditCatError(''); 
                }} fullWidth maxWidth="sm" TransitionComponent={Fade} transitionDuration={{ enter: 200, exit: 100 }}>
                  <DialogTitle>Edit category</DialogTitle>
                  <DialogContent>
                    {editCatError && <Alert severity="error" sx={{ mb: 1 }}>{editCatError}</Alert>}
                    <Box component="form" sx={{ mt: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            required
                            size="small"
                            label="Name"
                            value={editCatForm.name}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, name: e.target.value }))}
                            fullWidth
                            error={Boolean(editFieldErrors.name)}
                            helperText={editFieldErrors.name}
                            inputRef={editNameRef}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            label="Description"
                            value={editCatForm.description}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, description: e.target.value }))}
                            fullWidth
                            error={Boolean(editFieldErrors.description)}
                            helperText={editFieldErrors.description}
                            inputRef={editDescriptionRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Estimated time per person (min)"
                            type="number"
                            inputProps={{ min: 1 }}
                            value={editCatForm.estimated_time}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, estimated_time: e.target.value }))}
                            helperText={editFieldErrors.estimated_time || 'Walk-in wait estimate in minutes'}
                            error={Boolean(editFieldErrors.estimated_time)}
                            fullWidth
                            inputRef={editEstimatedRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Phone (optional)"
                            value={editCatForm.phone_number}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, phone_number: e.target.value }))}
                            helperText={editFieldErrors.phone_number || 'E.164, e.g. +911234567890'}
                            error={Boolean(editFieldErrors.phone_number)}
                            fullWidth
                            inputRef={editPhoneRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Address line 1 (optional)"
                            value={editCatForm.address_line1}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, address_line1: e.target.value }))}
                            fullWidth
                            helperText={editFieldErrors.address_line1}
                            error={Boolean(editFieldErrors.address_line1)}
                            inputRef={editAddress1Ref}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Address line 2 (optional)"
                            value={editCatForm.address_line2}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, address_line2: e.target.value }))}
                            fullWidth
                            helperText={editFieldErrors.address_line2}
                            error={Boolean(editFieldErrors.address_line2)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Pincode / ZIP (optional)"
                            value={editCatForm.pincode}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, pincode: e.target.value }))}
                            fullWidth
                            helperText={editFieldErrors.pincode}
                            error={Boolean(editFieldErrors.pincode)}
                            inputRef={editPincodeRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Max advance days"
                            type="number"
                            inputProps={{ min: 1 }}
                            value={editCatForm.max_advance_days}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, max_advance_days: e.target.value }))}
                            helperText={editFieldErrors.max_advance_days || 'How many days ahead users can book'}
                            error={Boolean(editFieldErrors.max_advance_days)}
                            fullWidth
                            inputRef={editMaxAdvanceRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Max bookings per user per day"
                            type="number"
                            inputProps={{ min: 1 }}
                            value={editCatForm.max_scheduled_per_user_per_day}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, max_scheduled_per_user_per_day: e.target.value }))}
                            helperText={editFieldErrors.max_scheduled_per_user_per_day || 'Leave blank for unlimited'}
                            error={Boolean(editFieldErrors.max_scheduled_per_user_per_day)}
                            fullWidth
                            inputRef={editMaxPerDayRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            size="small"
                            label="Timezone"
                            value={editCatForm.time_zone}
                            onChange={(e) => setEditCatForm((f) => ({ ...f, time_zone: e.target.value }))}
                            helperText={editFieldErrors.time_zone || 'e.g. Asia/Kolkata, America/New_York'}
                            error={Boolean(editFieldErrors.time_zone)}
                            fullWidth
                            inputRef={editTimezoneRef}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="edit-cat-type-label">Type</InputLabel>
                            <Select
                              labelId="edit-cat-type-label"
                              value={editCatForm.type}
                              label="Type"
                              onChange={(e) => setEditCatForm((f) => ({ ...f, type: e.target.value }))}
                            >
                              <MenuItem value="general">General</MenuItem>
                              <MenuItem value="inperson">In Person</MenuItem>
                              <MenuItem value="drive-thru">Drive-thru</MenuItem>
                              <MenuItem value="online">Online</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={<Switch checked={editCatForm.is_scheduled} onChange={(e) => setEditCatForm((f) => ({ ...f, is_scheduled: e.target.checked }))} />}
                            label="Scheduled appointments"
                          />
                        </Grid>
                        {editCatForm.is_scheduled && (
                          <Grid item xs={12}>
                            <Box sx={{ mt: 2, mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                  <InputLabel id="edit-interval-label">Slot interval</InputLabel>
                                  <Select
                                    labelId="edit-interval-label"
                                    value={editCatForm.time_interval_per_appointment || 15}
                                    label="Slot interval"
                                    onChange={(e) => setEditCatForm((f) => ({ ...f, time_interval_per_appointment: Number(e.target.value) }))}
                                  >
                                      {intervalOptions.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{formatIntervalLabel(opt)}</MenuItem>
                                      ))}
                                  </Select>
                                </FormControl>
                              </Box>
                              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Opening hours</Typography>
                              <Grid container spacing={1}>
                                {DAYS_OF_WEEK.map((day) => {
                                  const opening = (editCatForm.opening_hours && editCatForm.opening_hours[day]) || [];
                                  const isClosed = !opening || opening.length === 0;
                                  const br = (editCatForm.break_hours && editCatForm.break_hours[day]) || [];
                                  return (
                                    <Grid item xs={12} sm={6} key={`edit-open-${day}`}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 110 }}><Typography variant="body2">{day}</Typography></Box>
                                        <FormControlLabel
                                          control={<Switch size="small" checked={!isClosed} onChange={(e) => toggleDayOpenEdit(day, e.target.checked)} />}
                                          label={isClosed ? 'Closed' : 'Open'}
                                        />
                                      </Box>
                                      {!isClosed && (
                                        <Box sx={{ mt: 1 }}>
                                          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
                                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Opening</Typography>
                                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <TimeInput
                                                  value24={opening[0] ? opening[0][0] : '09:00'}
                                                  onChange={(val) => {
                                                    setEditCatForm((prev) => {
                                                      const oh = { ...(prev.opening_hours || {}) };
                                                      oh[day] = [[val, (oh[day] && oh[day][0] && oh[day][0][1]) || '17:00']];
                                                      return { ...prev, opening_hours: oh };
                                                    });
                                                  }}
                                                />
                                                <TimeInput
                                                  value24={opening[0] ? opening[0][1] : '17:00'}
                                                  onChange={(val) => {
                                                    setEditCatForm((prev) => {
                                                      const oh = { ...(prev.opening_hours || {}) };
                                                      oh[day] = [[(oh[day] && oh[day][0] && oh[day][0][0]) || '09:00', val]];
                                                      return { ...prev, opening_hours: oh };
                                                    });
                                                  }}
                                                />
                                              </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                                              <Button size="small" variant="text" fullWidth={window.innerWidth < 600} onClick={() => {
                                                setEditCatForm((prev) => {
                                                  const bh = { ...(prev.break_hours || {}) };
                                                  if (bh[day] && bh[day].length > 0) bh[day] = [];
                                                  else bh[day] = [['13:00','14:00']];
                                                  return { ...prev, break_hours: bh };
                                                });
                                              }} sx={{ color: 'primary.main', textTransform: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>{br && br.length > 0 ? 'Remove break' : 'Add break'}</Button>
                                            </Box>
                                          </Box>
                                        </Box>
                                      )}
                                      {br && br.length > 0 && (
                                        <Box sx={{ mt: 1, pl: { xs: 0, sm: 1 } }}>
                                          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0 }}>
                                              <Typography variant="caption" sx={{ color: 'warning.dark' }}>Break</Typography>
                                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: '#fff7e6', p: 0.5, borderRadius: 1 }}>
                                                <TimeInput
                                                  value24={br[0][0]}
                                                  onChange={(val) => {
                                                    setEditCatForm((prev) => {
                                                      const bh = { ...(prev.break_hours || {}) };
                                                      bh[day] = [[val, (bh[day] && bh[day][0] && bh[day][0][1]) || '14:00']];
                                                      return { ...prev, break_hours: bh };
                                                    });
                                                  }}
                                                />
                                                <TimeInput
                                                  value24={br[0][1]}
                                                  onChange={(val) => {
                                                    setEditCatForm((prev) => {
                                                      const bh = { ...(prev.break_hours || {}) };
                                                      bh[day] = [[(bh[day] && bh[day][0] && bh[day][0][0]) || '13:00', val]];
                                                      return { ...prev, break_hours: bh };
                                                    });
                                                  }}
                                                />
                                              </Box>
                                            </Box>
                                          </Box>
                                        </Box>
                                      )}
                                      {editDayErrors && editDayErrors[day] && (
                                        <FormHelperText error sx={{ mt: 0.5 }}>{editDayErrors[day]}</FormHelperText>
                                      )}
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setEditCatDialogOpen(false)} disabled={editCatLoading}>Cancel</Button>
                    <Button onClick={handleEditCategory} variant="contained" disabled={editCatLoading}>
                      {editCatLoading ? <CircularProgress size={18} /> : 'Save'}
                    </Button>
                  </DialogActions>
                </Dialog>

                {/* Org-admin simplified view: categories + create category-admin users (no appointments) */}
                {currentOrg && isOrgAdmin && (
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Categories</Typography>
                    <Stack spacing={1}>
                      {currentOrg.categories.map((cat) => (
                        <Paper key={`org-cat-${cat.id}`} elevation={0} sx={{ p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start', border: '1px solid', borderColor: 'divider', borderRadius: 2, position: 'relative', minHeight: { xs: 'auto', sm: 140 } }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={700}>{cat.name || cat.description || `Category #${cat.id}`}</Typography>
                            <Typography variant="caption" color="text.secondary">Type: {cat.type || 'general'} {cat.is_scheduled ? ' • Scheduled' : ''}</Typography>
                            {/* Assigned admins for this category */}
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              {categoryAdmins && categoryAdmins.filter((a) => Array.isArray(a.category_ids) && a.category_ids.includes(cat.id)).map((a) => (
                                <Chip
                                  key={`admin-${a.id}-${cat.id}`}
                                  label={`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.username}
                                  size="small"
                                  clickable
                                  onClick={() => handleOpenEditUser(a)}
                                  avatar={<Avatar>{(a.first_name && a.first_name[0]) || (a.username && a.username[0]) || 'U'}</Avatar>}
                                  sx={{ mr: 0.5 }}
                                  deleteIcon={<DeleteIcon />}
                                  onDelete={() => handleDeleteCategoryUser(a.id)}
                                />
                              ))}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', alignSelf: { xs: 'stretch', sm: 'flex-start' }, width: { xs: '100%', sm: 'auto' } }}>
                            <Button size="small" onClick={() => { setEditingUserId(null); setCreateUserDialogOpen(true); setCreateUserForm({ first_name: '', last_name: '', email: '', phone: '', category_ids: [cat.id] }); }} fullWidth={window.innerWidth < 600}>Create Admin</Button>
                            <Button size="small" variant="outlined" onClick={() => handleOpenEditCat(cat)} fullWidth={window.innerWidth < 600}>Edit</Button>
                            <FormControlLabel
                              control={<Switch checked={cat.status === 'active'} onChange={() => handleToggleStatus(cat)} />}
                              label={<Typography variant="body2" fontWeight={600}>{cat.status === 'active' ? '🟢 Active' : '🔴 Inactive'}</Typography>}
                              sx={{ m: 0, minWidth: { xs: '100%', sm: 'auto' } }}
                            />
                            {canManageOrg(cat.organization) && (
                              <Button size="small" color="error" variant="outlined" onClick={() => { setDeleteTarget(cat); setDeleteConfirmOpen(true); }} fullWidth={window.innerWidth < 600}>Delete</Button>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Category panel content */}
                {currentCategory && !isOrgAdmin && (
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
                            {`Add to queue${unscheduledCounts[currentCategory.id] ? ` (${unscheduledCounts[currentCategory.id]} waiting)` : ''}`}
                          </Button>
                        )}

                        {/* Delete category (org-admin or staff) */}
                        {canManageOrg(currentCategory.organization) && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => { setDeleteTarget(currentCategory); setDeleteConfirmOpen(true); }}
                            sx={{ ml: 1 }}
                          >
                            Delete
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

      {/* Shared country selector menu used by phone inputs (queue + create-user) */}
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

      {/* Add User to Queue Modal */}
      <Dialog open={queueModalOpen} onClose={closeQueueModal} fullWidth maxWidth="sm">
        <DialogTitle>Add user to queue — {queueModalCategory ? (queueModalCategory.name || `Category #${queueModalCategory.id}`) : ''}</DialogTitle>
        <DialogContent>
          {queueError && <Alert severity="error" sx={{ mb: 2 }}>{queueError}</Alert>}
          {queuePreview && queuePreview.count > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{`There are ${queuePreview.count} people currently waiting.`}</Typography>
              <Typography variant="caption" color="text.secondary">You'll be added after them.</Typography>
            </Box>
          )}
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
                      </InputAdornment>
                    ),
                  }}
                  error={!!queueFormErrors.phone}
                  helperText={queueFormErrors.phone || (() => {
                    const examples = { US: '202 555 0100', CA: '416 555 0100', IN: '98765 43210', GB: '7911 123456', AU: '412 345 678' };
                    const ex = examples[selectedCountry?.code] || '10-digit local number';
                    return `Enter local number without country code, e.g. ${ex}`;
                  })()}
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
            {queueLoading ? <CircularProgress size={18} color="inherit" /> : (`Add to queue${queuePreview && queuePreview.count ? ` (you'll be #${queuePreview.count + 1})` : ''}`)}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete user?"
        message="Delete this user? This action cannot be undone."
        onClose={() => { setDeleteDialogOpen(false); setUserToDelete(null); }}
        onConfirm={performDeleteCategoryUser}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteLoading}
      />
    </AdminErrorBoundary>
  );
}
