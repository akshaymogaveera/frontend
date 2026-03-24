import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
// import { formatToCategoryTimezone } from '../utils/timezone.js';
import { useNavigate } from 'react-router-dom';
import {
  timeOnly,
  formatDateTime,
  formatDate,
  formatDateTimeLocal,
  formatDateLocal,
  formatServerDateTime,
} from '../utils/timezone.js';
import { ENDPOINTS, apiCall } from '../utils/api.js';
import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Fade,
  Skeleton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import TagIcon from '@mui/icons-material/Tag';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import Navbar from '../components/Navbar.js';

const statusConfig = {
  active: { label: 'Active', color: 'success', bg: '#e8f5e9', text: '#2e7d32' },
  inactive: { label: 'Inactive', color: 'default', bg: '#f5f5f5', text: '#616161' },
  checkin: { label: 'Checked In', color: 'info', bg: '#e3f2fd', text: '#1565c0' },
  checkout: { label: 'Checked Out', color: 'default', bg: '#ede7f6', text: '#4527a0' },
  cancel: { label: 'Cancelled', color: 'error', bg: '#fce4ec', text: '#c62828' },
};

const borderColor = {
  active: '#2e7d32',
  inactive: '#bdbdbd',
  checkin: '#1565c0',
  checkout: '#4527a0',
  cancel: '#c62828',
};

function AppointmentRow({ appt, onClick }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cfg = statusConfig[appt.status] || {
    label: appt.status,
    color: 'default',
    bg: '#f5f5f5',
    text: '#333',
  };

  return (
    <ListItemButton
      onClick={() => onClick(appt)}
      sx={{
        borderRadius: 2,
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `5px solid ${borderColor[appt.status] || '#bdbdbd'}`,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: (theme) => (theme.palette.custom ? theme.palette.custom.mint : '#E0F7F9'),
          borderColor: 'primary.light',
        },
        py: isMobile ? 2 : 1.5,
        px: 2,
        gap: 0,
        alignItems: 'center',
      }}
    >
      {/* Queue avatar — larger on mobile */}
      <Avatar
        sx={{
          width: isMobile ? 52 : 38,
          height: isMobile ? 52 : 38,
          fontSize: isMobile ? 16 : 13,
          fontWeight: 900,
          mr: 2,
          background: (theme) =>
            appt.status === 'active' || appt.status === 'checkin'
              ? theme.palette.custom
                ? theme.palette.custom.gradientPrimary
                : 'var(--gradient-primary)'
              : 'rgba(0,0,0,0.1)',
          color: ['active', 'checkin'].includes(appt.status) ? '#fff' : '#666',
          flexShrink: 0,
          boxShadow: appt.status === 'active' ? '0 2px 8px rgba(0,123,255,0.18)' : 'none',
        }}
      >
        {appt.counter != null ? `#${appt.counter}` : '–'}
      </Avatar>

      {/* Main info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="body1"
            fontWeight={700}
            noWrap
            sx={{ maxWidth: isMobile ? 180 : 220 }}
          >
            {appt.organization_name || `Org #${appt.organization}`}
          </Typography>
          {appt.status && (
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 11,
                height: 20,
                bgcolor: cfg.bg,
                color: cfg.text,
                border: 'none',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {appt.category_name || `Category #${appt.category}`}
          {appt.is_scheduled && appt.scheduled_time
            ? ` · 📅 ${
                appt.scheduled_time_display
                  ? appt.scheduled_time_display
                  : appt.scheduled_time_with_category_tz
                    ? appt.scheduled_time_with_category_tz
                    : formatServerDateTime(appt.scheduled_time)
              }`
            : ' · 🚶 Walk-in'}
        </Typography>
        {/* Estimated wait time for walk-in appointments - only show if active */}
        {appt.status === 'active' &&
          !appt.is_scheduled &&
          appt.counter != null &&
          appt.counter > 0 &&
          appt.category_estimated_time > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: 'warning.dark',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              ⏱ ~
              {(() => {
                const mins = (appt.counter - 1) * appt.category_estimated_time;
                if (mins <= 0) return 'your turn soon';
                if (mins >= 60) {
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
                }
                return `${mins} min`;
              })()}{' '}
              wait
            </Typography>
          )}
      </Box>

      {/* Right side */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          ml: 2,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
          {appt.is_scheduled
            ? appt.scheduled_time
              ? formatServerDateTime(appt.scheduled_time)
              : 'TBD'
            : appt.date_created
              ? formatDateLocal(new Date(appt.date_created))
              : formatDateLocal(new Date())}
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.3 }} />
      </Box>
    </ListItemButton>
  );
}

function AppointmentDetailDrawer({ appt, open, onClose, onCancel, onRefresh, refreshLoading }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const token = localStorage.getItem('accessToken');
  const [user, setUser] = useState(null);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiCall(ENDPOINTS.ME);
        setUser(data);
      } catch (e) {
        /* ignore */
      }
    };
    if (token) fetchUser();
  }, [token]);

  // Check if user is admin for this appointment's category
  const isUserAdmin = () => {
    if (!user || !appt) return false;
    return (
      user.is_staff ||
      user.is_superuser ||
      (user.groups && user.groups.some((g) => g.id === appt.category_group_id))
    );
  };

  // Stable refs so async callbacks always get latest values
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  const apptRef = React.useRef(appt);
  apptRef.current = appt;

  const doFetchNotes = React.useRef(async () => {
    const a = apptRef.current;
    if (!a) return;
    const hdrs = {
      Authorization: `Bearer ${tokenRef.current}`,
      'Content-Type': 'application/json',
    };
    setLoadingNotes(true);
    try {
      const data = await apiCall(ENDPOINTS.APPOINTMENT_NOTES(a.id));
      setNotes(data);
    } catch (e) {
      /* ignore */
    }
    setLoadingNotes(false);
  });

  useEffect(() => {
    if (open && appt) {
      (async () => {
        setNoteText('');
        setNoteError('');
        await doFetchNotes.current();
      })();
    } else {
      (async () => {
        setNotes([]);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appt && appt.id]);

  const handleAddUserNote = async () => {
    const a = apptRef.current;
    if (!noteText.trim() && !uploadedFile) {
      setNoteError('Please write a note or attach a file before submitting.');
      return;
    }
    setNoteError('');
    setSubmittingNote(true);

    try {
      const payload = { content: noteText.trim() };

      // If file was uploaded, convert to base64 and include in payload
      if (uploadedFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            payload.file_data = e.target.result; // base64 data URL
            payload.file_name = uploadedFileName;
            payload.file_mime = uploadedFile.type;

            const res = await apiCall(ENDPOINTS.APPOINTMENT_NOTES(a.id), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            setNoteText('');
            setUploadedFile(null);
            setUploadedFileName('');
            await doFetchNotes.current();
            setSubmittingNote(false);
          } catch (error) {
            const errMsg = error.message || 'Failed to process file';
            setNoteError(errMsg);
            setSubmittingNote(false);
          }
        };
        reader.readAsDataURL(uploadedFile);
      } else {
        // No file, just send content
        try {
          await apiCall(ENDPOINTS.APPOINTMENT_NOTES(a.id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          setNoteText('');
          setUploadedFile(null);
          setUploadedFileName('');
          await doFetchNotes.current();
        } catch (error) {
          setNoteError(error.message || 'Failed to add note');
        }
        setSubmittingNote(false);
      }
    } catch {
      setNoteError('Network error');
      setSubmittingNote(false);
    }
  };

  const handleDownloadFile = async (noteId) => {
    const a = apptRef.current;
    try {
      const res = await apiCall(ENDPOINTS.APPOINTMENT_NOTE_FILE(a.id, noteId));
      const { file_data, file_name } = res;
      if (!file_data) return;
      const anchor = document.createElement('a');
      anchor.href = file_data;
      anchor.download = file_name || 'attachment';
      anchor.click();
    } catch {
      /* ignore */
    }
  };

  if (!appt) return null;
  const cfg = statusConfig[appt.status] || { label: appt.status, bg: '#f5f5f5', text: '#333' };
  const canCancel = appt.status === 'active' || appt.status === 'inactive';
  // Detect iOS (covers Safari and Chrome on iOS). We'll apply a larger top offset
  // on iPhones which sometimes report varying safe-area inset values.
  const isiOS = typeof navigator !== 'undefined' && /iPhone/.test(navigator.userAgent);

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: isMobile
          ? { borderRadius: '20px 20px 0 0', overflow: 'hidden', maxHeight: '92vh' }
          : { width: 420, borderRadius: '12px 0 0 12px', overflow: 'hidden' },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: (theme) =>
            theme.palette.custom
              ? `linear-gradient(135deg, ${theme.palette.custom.teal} 0%, ${theme.palette.primary.main} 100%)`
              : 'var(--gradient-primary)',
          p: 2,
          pb: 1.5,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>
              Appointment Details
            </Typography>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ fontSize: isMobile ? '1.5rem' : '1.75rem' }}
            >
              #{appt.id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.25)',
                color: (theme) => theme.palette.custom.deepSlate,
                fontWeight: 700,
                fontSize: 11,
                textShadow: '0 1px 0 rgba(255,255,255,0.06)',
              }}
            />
            <Tooltip title="Refresh appointment">
              <span>
                <IconButton
                  onClick={() => onRefresh && onRefresh(appt && appt.id)}
                  size="small"
                  sx={{ color: (theme) => theme.palette.custom.deepSlate, p: '6px' }}
                  disabled={refreshLoading}
                >
                  {refreshLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: (theme) => theme.palette.custom.deepSlate, p: '6px', zIndex: 2 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Big queue counter */}
        {appt.counter != null && (
          <Box
            sx={{
              mt: 1.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.13)',
              borderRadius: 3,
              py: isMobile ? 2 : 1.5,
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 60 : 56,
                fontWeight: 900,
                lineHeight: 1,
                color: '#fff',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                letterSpacing: -2,
              }}
            >
              #{appt.counter}
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.8, mt: 0.3, fontWeight: 600, letterSpacing: 1, fontSize: 11 }}
            >
              QUEUE POSITION
            </Typography>
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        <List dense disablePadding>
          <DetailRow
            icon={<BusinessOutlinedIcon color="primary" />}
            label="Organization"
            value={appt.organization_name || `Org #${appt.organization}`}
          />
          <DetailRow
            icon={<CategoryOutlinedIcon color="secondary" />}
            label="Service / Category"
            value={appt.category_name || `Category #${appt.category}`}
          />
          {appt.category_description && appt.category_description !== appt.category_name && (
            <DetailRow
              icon={<CategoryOutlinedIcon sx={{ opacity: 0.4 }} />}
              label="Description"
              value={appt.category_description}
            />
          )}
          {(() => {
            const displayName =
              `${(appt.user_first_name || appt.first_name || '').trim()} ${(appt.user_last_name || '').trim()}`.trim() ||
              appt.username ||
              `User #${appt.user}`;
            return (
              <DetailRow
                icon={<PersonOutlineIcon sx={{ color: 'text.secondary' }} />}
                label="User"
                value={displayName}
              />
            );
          })()}

          {!appt.is_scheduled &&
            appt.counter != null &&
            appt.counter > 0 &&
            appt.category_estimated_time > 0 && (
              <DetailRow
                icon={<AccessTimeOutlinedIcon sx={{ color: 'warning.main' }} />}
                label="Estimated Wait Time"
                value={(() => {
                  const mins = (appt.counter - 1) * appt.category_estimated_time;
                  if (mins <= 0) return '🎉 Your turn soon!';
                  if (mins >= 60) {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return m > 0 ? `~${h} hr ${m} min` : `~${h} hr`;
                  }
                  return `~${mins} min`;
                })()}
                highlight
              />
            )}

          {appt.is_scheduled && appt.scheduled_time && (
            <>
              <DetailRow
                icon={<CalendarTodayOutlinedIcon color="primary" />}
                label="Scheduled Time"
                value={
                  appt.scheduled_time_display
                    ? appt.scheduled_time_display
                    : appt.scheduled_time_with_category_tz
                      ? appt.scheduled_time_with_category_tz
                      : formatServerDateTime(appt.scheduled_time)
                }
                highlight
              />
              {appt.scheduled_end_time && (
                <DetailRow
                  icon={<CalendarTodayOutlinedIcon sx={{ opacity: 0.5 }} />}
                  label="End Time"
                  value={formatServerDateTime(appt.scheduled_end_time)}
                />
              )}
            </>
          )}

          {appt.checkout_time && (
            <DetailRow
              icon={<LogoutOutlinedIcon sx={{ color: '#4527a0' }} />}
              label="Checked Out At"
              value={formatServerDateTime(appt.checkout_time, true)}
              highlight
            />
          )}

          <Divider sx={{ my: 1.5 }} />

          <DetailRow
            icon={<AccessTimeOutlinedIcon sx={{ color: 'text.disabled' }} />}
            label="Created"
            value={formatDateTimeLocal(appt.date_created, true)}
          />
          <DetailRow
            icon={<TagIcon sx={{ color: 'text.disabled' }} />}
            label="Type"
            value={appt.is_scheduled ? '📅 Scheduled' : '🚶 Walk-in (Unscheduled)'}
          />
        </List>

        {/* ---- Notes section (Collapsible) ---- */}
        <Divider sx={{ my: 2 }} />
        <Box
          onClick={() => setNotesExpanded(!notesExpanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            cursor: 'pointer',
            py: 1,
            px: 1,
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
            userSelect: 'none',
          }}
        >
          <NoteOutlinedIcon sx={{ fontSize: 17 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
            Notes {notes.length > 0 && `(${notes.length})`}
          </Typography>
          <Box
            sx={{
              transform: notesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>

        {/* Notes content - shown when expanded */}
        {notesExpanded && (
          <Box sx={{ mt: 1 }}>
            {loadingNotes ? (
              <Box>
                {[...Array(2)].map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={48}
                    sx={{ mb: 0.75, borderRadius: 2 }}
                  />
                ))}
              </Box>
            ) : notes.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
                No notes yet.
              </Typography>
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
                    }}
                  >
                    {note.content && (
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.82rem', wordBreak: 'break-word' }}
                      >
                        {note.content}
                      </Typography>
                    )}
                    {note.has_file && (
                      <Button
                        size="small"
                        startIcon={<DownloadIcon sx={{ fontSize: 13 }} />}
                        onClick={() => handleDownloadFile(note.id)}
                        sx={{
                          mt: 0.5,
                          fontSize: 11,
                          py: 0.25,
                          px: 0.75,
                          borderRadius: 1.5,
                          textTransform: 'none',
                        }}
                      >
                        {note.file_name || 'Download file'}
                      </Button>
                    )}
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: 'block', mt: 0.3, fontSize: '0.7rem' }}
                    >
                      {note.is_admin_note ? '🛡 Admin' : '👤 You'} · {note.added_by_name || ''} ·{' '}
                      {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {/* User add-note input - only shown when notes expanded */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              <TextField
                size="small"
                multiline
                minRows={2}
                placeholder="Add a note (optional)"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 1000))}
                inputProps={{ maxLength: 1000 }}
                helperText={`${noteText.length}/1000`}
                FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
              />

              {/* File upload section - only for admins */}
              {isUserAdmin() && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    component="label"
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, flex: 1 }}
                  >
                    📎 Attach File
                    <input
                      hidden
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUploadedFile(e.target.files[0]);
                          setUploadedFileName(e.target.files[0].name);
                          setNoteError('');
                        }
                      }}
                    />
                  </Button>
                  {uploadedFileName && (
                    <Button
                      size="small"
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: 11,
                        px: 1.5,
                        color: 'text.secondary',
                        flex: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      ✅ {uploadedFileName}
                    </Button>
                  )}
                </Box>
              )}

              {noteError && (
                <Typography variant="caption" color="error">
                  {noteError}
                </Typography>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  submittingNote ? (
                    <CircularProgress size={13} />
                  ) : (
                    <NoteAddOutlinedIcon sx={{ fontSize: 15 }} />
                  )
                }
                onClick={handleAddUserNote}
                disabled={submittingNote || (!noteText.trim() && !uploadedFile)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, alignSelf: 'flex-end' }}
              >
                {submittingNote ? 'Saving…' : 'Add Note'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer actions */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', pb: isMobile ? 3 : 2 }}>
        {canCancel ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<CancelOutlinedIcon />}
            onClick={() => {
              onClose();
              onCancel(appt);
            }}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Cancel Appointment
          </Button>
        ) : (
          <Typography variant="body2" color="text.disabled" textAlign="center">
            This appointment cannot be modified.
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}

function DetailRow({ icon, label, value, highlight }) {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, flexShrink: 0 }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={highlight ? 700 : 500}
              color={highlight ? 'text.primary' : 'text.secondary'}
              sx={{ textAlign: 'right' }}
            >
              {value}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appointmentId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Ref for infinite scroll
  const loadMoreRef = React.useRef(null);

  const [tab, setTab] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshLoading, setRefreshLoading] = useState(false);

  const token = localStorage.getItem('accessToken');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const tabEndpoints = [
    ENDPOINTS.APPOINTMENTS_ALL(),
    ENDPOINTS.APPOINTMENTS_UNSCHEDULED(),
    ENDPOINTS.APPOINTMENTS_SCHEDULED(),
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      setPage(1);
      setHasMore(false);
      setNextPageUrl(null);
      try {
        const endpoint =
          tabEndpoints[tab] +
          (statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '');
        const data = await apiCall(endpoint);
        if (!mounted) return;
        setAppointments(data.results || []);
        setTotalCount(typeof data.count === 'number' ? data.count : (data.results || []).length);
        setNextPageUrl(data.next || null);
        setHasMore(Boolean(data.next));
        setPage(1);

        // If the page was opened with appointmentId in URL, fetch and open that appointment
        const targetId = appointmentId || location?.state?.openApptId;
        if (targetId) {
          const found = (data.results || []).find((a) => String(a.id) === String(targetId));
          if (found) {
            setSelected(found);
            setDrawerOpen(true);
            // Clear navigation state so re-rendering doesn't re-open the drawer
            try {
              navigate(location.pathname, { replace: true, state: {} });
            } catch (e) {
              /* ignore */
            }
          } else {
            // fetch the appointment directly
            try {
              const ap = await apiCall(ENDPOINTS.APPOINTMENT_DETAIL(targetId));
              if (!mounted) return;
              setSelected(ap);
              setDrawerOpen(true);
              try {
                navigate(location.pathname, { replace: true, state: {} });
              } catch (e) {
                /* ignore */
              }
            } catch (err) {
              // ignore - don't block the page
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        if (err.status === 401) {
          localStorage.clear();
          navigate('/');
        } else {
          setError(err.message || 'Network error. Please try again.');
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token, location?.state?.openApptId, navigate, reloadKey, statusFilter]);

  const handleRowClick = (appt) => {
    setSelected(appt);
    setDrawerOpen(true);
  };

  const handleLoadMore = useCallback(async () => {
    if (!nextPageUrl || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await apiCall(nextPageUrl);
      setAppointments((prev) => [...prev, ...(data.results || [])]);
      setNextPageUrl(data.next || null);
      setHasMore(Boolean(data.next));
      setPage((p) => p + 1);
    } catch (err) {
      console.error('Failed to load more appointments:', err);
      // Don't show error banner for loadMore, just silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore, hasMore]);

  // Infinite scroll: Automatically load more when user scrolls near the Load More button
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        // If the load more button is visible, trigger auto-load
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          await handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1,
      }
    );

    // Observe the load more button element - store ref in variable for cleanup
    const loadMoreElement = loadMoreRef.current;
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }

    return () => {
      if (loadMoreElement) {
        observer.unobserve(loadMoreElement);
      }
    };
  }, [hasMore, loadingMore, loading, handleLoadMore]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError('');
    try {
      await apiCall(ENDPOINTS.APPOINTMENT_CANCEL(cancelTarget.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setCancelTarget(null);
      setReloadKey((r) => r + 1);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel appointment.');
    }
    setCancelling(false);
  };

  const handleRefreshAppointment = async (id) => {
    if (!id) return;
    setRefreshLoading(true);
    try {
      const ap = await apiCall(ENDPOINTS.APPOINTMENT_DETAIL(id));
      setSelected(ap);
      // also update appointments list if present
      setAppointments((prev) => {
        if (!Array.isArray(prev)) return prev;
        const idx = prev.findIndex((a) => String(a.id) === String(ap.id));
        if (idx === -1) return prev;
        const copy = prev.slice();
        copy[idx] = ap;
        return copy;
      });
    } catch (err) {
      if (err.status === 401) {
        localStorage.clear();
        navigate('/');
      }
      // ignore network errors here — user can retry
    }
    setRefreshLoading(false);
  };

  // Stats
  const activeCount = appointments.filter((a) => a.status === 'active').length;
  const checkinCount = appointments.filter((a) => a.status === 'checkin').length;
  const checkoutCount = appointments.filter((a) => a.status === 'checkout').length;
  const firstActive = appointments.find((a) => a.status === 'active');

  const tabLabels = ['All', 'Walk-ins', 'Scheduled'];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      {/* Mobile hero counter — shown when user has an active appointment */}
      {isMobile && firstActive && (
        <Box
          sx={{
            background: (theme) =>
              theme.palette.custom
                ? `linear-gradient(135deg, ${theme.palette.custom.teal} 0%, ${theme.palette.primary.main} 100%)`
                : 'var(--gradient-primary)',
            color: '#fff',
            px: 3,
            pt: 3,
            pb: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 2 }}>
            YOUR QUEUE POSITION
          </Typography>
          <Typography
            sx={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              textShadow: '0 6px 24px rgba(0,0,0,0.3)',
              letterSpacing: -4,
            }}
          >
            #{firstActive.counter}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
            {firstActive.organization_name} · {firstActive.category_name}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            sx={{
              mt: 1.5,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.5)',
              borderRadius: 2,
              fontSize: 12,
            }}
            onClick={() => handleRowClick(firstActive)}
          >
            View Details
          </Button>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: isMobile ? '100%' : isTablet ? '100%' : 860,
          mx: 'auto',
          px: isMobile ? 1.5 : isTablet ? 2 : 3,
          py: isMobile ? 2 : 4,
        }}
      >
        {/* Page header */}
        <Fade in timeout={400}>
          <Box sx={{ mb: isMobile ? 2 : 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                {!isMobile && (
                  <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary', mb: 0.5 }}>
                    My Appointments
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: isMobile ? 0 : 1 }}>
                  {activeCount > 0 && (
                    <Chip
                      label={`${activeCount} Active`}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  {checkinCount > 0 && (
                    <Chip
                      label={`${checkinCount} Checked In`}
                      size="small"
                      color="info"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  {checkoutCount > 0 && (
                    <Chip
                      label={`${checkoutCount} Checked Out`}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: '#ede7f6', color: '#4527a0' }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={() => setReloadKey((r) => r + 1)}
                    disabled={loading}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: (theme) =>
                        theme.palette.custom ? theme.palette.custom.teal : '#00C4CC',
                      color: '#fff',
                      borderRadius: '50%',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.custom ? theme.palette.primary.main : '#007BFF',
                      },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={18} sx={{ color: '#fff' }} />
                    ) : (
                      <RefreshIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => navigate('/home')}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    borderRadius: 12,
                    px: 3,
                    py: 1.25,
                    background: (theme) =>
                      theme.palette.custom
                        ? theme.palette.custom.gradientPrimary
                        : 'var(--gradient-primary)',
                    color: '#fff',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                    '& .MuiButton-startIcon': { color: '#fff' },
                    '&:hover': { opacity: 0.95 },
                  }}
                >
                  {isMobile ? 'Book' : 'Book New'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            mb: isMobile ? 2 : 3,
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              minWidth: isMobile ? 0 : 80,
            },
            '& .MuiTabs-indicator': {
              background: (theme) =>
                theme.palette.custom
                  ? theme.palette.custom.gradientPrimary
                  : 'var(--gradient-primary)',
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          {tabLabels.map((label, i) => (
            <Tab key={i} label={label} />
          ))}
        </Tabs>

        {/* Status dropdown (persistent across tabs) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setStatusAnchor(e.currentTarget)}
            sx={{ minWidth: 140, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            {totalCount != null && (
              <Box component="span" sx={{ fontWeight: 800 }}>
                {totalCount}
              </Box>
            )}
            <Box component="span" sx={{ textTransform: 'none', fontWeight: 600 }}>
              {statusConfig[statusFilter]?.label || statusFilter}
            </Box>
          </Button>
          <Menu
            anchorEl={statusAnchor}
            open={Boolean(statusAnchor)}
            onClose={() => setStatusAnchor(null)}
          >
            {[
              { key: 'active', label: 'Active' },
              { key: 'inactive', label: 'Inactive' },
              { key: 'checkin', label: 'Checked In' },
              { key: 'checkout', label: 'Checked Out' },
              { key: 'cancel', label: 'Cancelled' },
            ].map((o) => (
              <MenuItem
                key={o.key}
                selected={statusFilter === o.key}
                onClick={() => {
                  setStatusFilter(o.key);
                  setStatusAnchor(null);
                }}
              >
                {o.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box>
            {[...Array(4)].map((_, i) => (
              <Paper
                key={i}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Skeleton
                  variant="circular"
                  width={isMobile ? 52 : 38}
                  height={isMobile ? 52 : 38}
                />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="55%" height={20} />
                  <Skeleton width="40%" height={16} />
                </Box>
                <Skeleton width={60} height={20} />
              </Paper>
            ))}
          </Box>
        )}

        {/* List */}
        {!loading && appointments.length > 0 && (
          <Fade in timeout={300}>
            <List disablePadding>
              {appointments.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} onClick={handleRowClick} />
              ))}
            </List>
          </Fade>
        )}

        {/* Load More Button - Auto-triggers on scroll (infinite scroll) */}
        {hasMore && !loading && (
          <Box ref={loadMoreRef} sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Showing {appointments.length} of {totalCount} appointments
            </Typography>
            {loadingMore && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="caption" color="text.secondary">
                  Loading more...
                </Typography>
              </Box>
            )}
            {!loadingMore && (
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loadingMore}
                sx={{ mt: 1 }}
              >
                Load More
              </Button>
            )}
          </Box>
        )}

        {/* Empty state */}
        {!loading && appointments.length === 0 && !error && (
          <Fade in timeout={300}>
            <Box sx={{ textAlign: 'center', py: isMobile ? 8 : 10 }}>
              <EventAvailableOutlinedIcon
                sx={{
                  fontSize: 72,
                  opacity: 0.12,
                  mb: 2,
                  color: (theme) => (theme.palette.custom ? theme.palette.custom.teal : '#00C4CC'),
                }}
              />
              <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
                No appointments here
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                Join a queue to see your appointments.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => navigate('/home')}
                sx={{ borderRadius: 2 }}
              >
                Find a Queue
              </Button>
            </Box>
          </Fade>
        )}
      </Box>

      {/* Detail Drawer */}
      <AppointmentDetailDrawer
        appt={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCancel={(appt) => {
          setCancelTarget(appt);
          setCancelError('');
        }}
        onRefresh={handleRefreshAppointment}
        refreshLoading={refreshLoading}
      />

      {/* Cancel dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => !cancelling && setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, overflow: 'hidden' } }}
      >
        <Box
          sx={{
            height: 4,
            background: (theme) =>
              theme.palette.custom
                ? theme.palette.custom.gradientPrimary
                : 'var(--gradient-primary)',
          }}
        />
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Appointment</DialogTitle>
        <DialogContent>
          {cancelTarget && (
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to cancel <strong>Appointment #{cancelTarget.id}</strong>
              {cancelTarget.counter ? ` (Queue #${cancelTarget.counter})` : ''}?
            </Typography>
          )}
          {cancelError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {cancelError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => {
              setCancelTarget(null);
              setCancelError('');
            }}
            variant="outlined"
            disabled={cancelling}
            sx={{ borderRadius: 2 }}
          >
            Keep it
          </Button>
          <Button
            onClick={handleCancel}
            variant="contained"
            color="error"
            disabled={cancelling}
            startIcon={
              cancelling ? <CircularProgress size={16} color="inherit" /> : <CancelOutlinedIcon />
            }
            sx={{ borderRadius: 2 }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
