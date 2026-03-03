import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Navbar from '../components/Navbar.js';

const API_BASE = '/api';

const statusConfig = {
  active:   { label: 'Active',      color: 'success', bg: '#e8f5e9', text: '#2e7d32' },
  inactive: { label: 'Inactive',    color: 'default', bg: '#f5f5f5', text: '#616161' },
  checkin:  { label: 'Checked In',  color: 'info',    bg: '#e3f2fd', text: '#1565c0' },
  checkout: { label: 'Checked Out', color: 'default', bg: '#ede7f6', text: '#4527a0' },
  cancel:   { label: 'Cancelled',   color: 'error',   bg: '#fce4ec', text: '#c62828' },
};

const borderColor = {
  active:   '#2e7d32',
  inactive: '#bdbdbd',
  checkin:  '#1565c0',
  checkout: '#4527a0',
  cancel:   '#c62828',
};

function AppointmentRow({ appt, onClick }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cfg = statusConfig[appt.status] || { label: appt.status, color: 'default', bg: '#f5f5f5', text: '#333' };

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
        '&:hover': { bgcolor: 'rgba(131,58,180,0.04)', borderColor: 'primary.light' },
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
          background: appt.status === 'active'
            ? 'linear-gradient(135deg, #833ab4, #fd1d1d)'
            : appt.status === 'checkin'
            ? 'linear-gradient(135deg, #1565c0, #42a5f5)'
            : 'rgba(0,0,0,0.1)',
          color: ['active', 'checkin'].includes(appt.status) ? '#fff' : '#666',
          flexShrink: 0,
          boxShadow: appt.status === 'active' ? '0 2px 8px rgba(131,58,180,0.35)' : 'none',
        }}
      >
        {appt.counter != null ? `#${appt.counter}` : '–'}
      </Avatar>

      {/* Main info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body1" fontWeight={700} noWrap sx={{ maxWidth: isMobile ? 180 : 220 }}>
            {appt.organization_name || `Org #${appt.organization}`}
          </Typography>
          <Chip
            label={cfg.label}
            size="small"
            sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: cfg.bg, color: cfg.text, border: 'none' }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {appt.category_name || `Category #${appt.category}`}
          {appt.is_scheduled && appt.scheduled_time
            ? ` · 📅 ${new Date(appt.scheduled_time).toLocaleString()}`
            : ' · 🚶 Walk-in'}
        </Typography>
      </Box>

      {/* Right side */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 2, flexShrink: 0 }}>
        <Typography variant="caption" color="text.disabled">
          {new Date(appt.date_created).toLocaleDateString()}
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.3 }} />
      </Box>
    </ListItemButton>
  );
}

function AppointmentDetailDrawer({ appt, open, onClose, onCancel }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!appt) return null;
  const cfg = statusConfig[appt.status] || { label: appt.status, bg: '#f5f5f5', text: '#333' };
  const canCancel = appt.status === 'active' || appt.status === 'inactive';

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
          background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 100%)',
          p: 3,
          pb: 2,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>
              Appointment Details
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              #{appt.id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={cfg.label}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, fontSize: 12 }}
            />
            <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Big queue counter */}
        {appt.counter != null && (
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.13)',
              borderRadius: 3,
              py: isMobile ? 3 : 2,
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 80 : 64,
                fontWeight: 900,
                lineHeight: 1,
                color: '#fff',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                letterSpacing: -2,
              }}
            >
              #{appt.counter}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5, fontWeight: 600, letterSpacing: 1 }}>
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
          <DetailRow
            icon={<PersonOutlineIcon sx={{ color: 'text.secondary' }} />}
            label="User"
            value={appt.username || `User #${appt.user}`}
          />

          {appt.estimated_time && (
            <DetailRow
              icon={<AccessTimeOutlinedIcon sx={{ color: 'warning.main' }} />}
              label="Estimated Wait Time"
              value={new Date(appt.estimated_time).toLocaleTimeString()}
              highlight
            />
          )}

          {appt.is_scheduled && appt.scheduled_time && (
            <>
              <DetailRow
                icon={<CalendarTodayOutlinedIcon color="primary" />}
                label="Scheduled Time"
                value={new Date(appt.scheduled_time).toLocaleString()}
                highlight
              />
              {appt.scheduled_end_time && (
                <DetailRow
                  icon={<CalendarTodayOutlinedIcon sx={{ opacity: 0.5 }} />}
                  label="End Time"
                  value={new Date(appt.scheduled_end_time).toLocaleString()}
                />
              )}
            </>
          )}

          {appt.checkout_time && (
            <DetailRow
              icon={<LogoutOutlinedIcon sx={{ color: '#4527a0' }} />}
              label="Checked Out At"
              value={new Date(appt.checkout_time).toLocaleString()}
              highlight
            />
          )}

          <Divider sx={{ my: 1.5 }} />

          <DetailRow
            icon={<AccessTimeOutlinedIcon sx={{ color: 'text.disabled' }} />}
            label="Created"
            value={new Date(appt.date_created).toLocaleString()}
          />
          <DetailRow
            icon={<TagIcon sx={{ color: 'text.disabled' }} />}
            label="Type"
            value={appt.is_scheduled ? '📅 Scheduled' : '🚶 Walk-in (Unscheduled)'}
          />
        </List>
      </Box>

      {/* Footer actions */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', pb: isMobile ? 3 : 2 }}>
        {canCancel ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<CancelOutlinedIcon />}
            onClick={() => { onClose(); onCancel(appt); }}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, flexShrink: 0 }}>
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [tab, setTab] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const token = localStorage.getItem('accessToken');
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const tabEndpoints = [
    `${API_BASE}/appointments/?type=all&page_size=50`,
    `${API_BASE}/appointments/?type=unscheduled&page_size=50`,
    `${API_BASE}/appointments/?type=scheduled&page_size=50`,
  ];

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(tabEndpoints[tab], { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.results || []);
      } else if (res.status === 401) {
        localStorage.clear();
        navigate('/');
      } else {
        setError('Failed to load appointments.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleRowClick = (appt) => {
    setSelected(appt);
    setDrawerOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`${API_BASE}/appointments/${cancelTarget.id}/cancel/`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        setCancelTarget(null);
        fetchAppointments();
      } else {
        const err = await res.json();
        setCancelError(err.detail || 'Failed to cancel appointment.');
      }
    } catch {
      setCancelError('Network error.');
    }
    setCancelling(false);
  };

  // Stats
  const activeCount   = appointments.filter((a) => a.status === 'active').length;
  const checkinCount  = appointments.filter((a) => a.status === 'checkin').length;
  const checkoutCount = appointments.filter((a) => a.status === 'checkout').length;
  const firstActive   = appointments.find((a) => a.status === 'active');

  const tabLabels = ['All', 'Walk-ins', 'Scheduled'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Mobile hero counter — shown when user has an active appointment */}
      {isMobile && firstActive && (
        <Box
          sx={{
            background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 100%)',
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
            sx={{ mt: 1.5, color: '#fff', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 2, fontSize: 12 }}
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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                {!isMobile && (
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      background: 'linear-gradient(90deg, #833ab4 0%, #fd1d1d 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 0.5,
                    }}
                  >
                    My Appointments
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: isMobile ? 0 : 1 }}>
                  {activeCount > 0 && (
                    <Chip label={`${activeCount} Active`} size="small" color="success" sx={{ fontWeight: 600 }} />
                  )}
                  {checkinCount > 0 && (
                    <Chip label={`${checkinCount} Checked In`} size="small" color="info" sx={{ fontWeight: 600 }} />
                  )}
                  {checkoutCount > 0 && (
                    <Chip label={`${checkoutCount} Checked Out`} size="small" sx={{ fontWeight: 600, bgcolor: '#ede7f6', color: '#4527a0' }} />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={fetchAppointments}
                    disabled={loading}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => navigate('/home')}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #833ab4, #fd1d1d)',
                    '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' },
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
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: isMobile ? 0 : 80 },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          {tabLabels.map((label, i) => (
            <Tab key={i} label={label} />
          ))}
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* Loading */}
        {loading && (
          <Box>
            {[...Array(4)].map((_, i) => (
              <Paper key={i} sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={isMobile ? 52 : 38} height={isMobile ? 52 : 38} />
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

        {/* Empty state */}
        {!loading && appointments.length === 0 && !error && (
          <Fade in timeout={300}>
            <Box sx={{ textAlign: 'center', py: isMobile ? 8 : 10 }}>
              <EventAvailableOutlinedIcon sx={{ fontSize: 72, opacity: 0.12, mb: 2, color: '#833ab4' }} />
              <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
                No appointments here
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                Join a queue to see your appointments.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => navigate('/home')}
                sx={{
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #833ab4, #fd1d1d)',
                  '&:hover': { background: 'linear-gradient(45deg, #6a2d9f, #c40000)' },
                }}
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
        onCancel={(appt) => { setCancelTarget(appt); setCancelError(''); }}
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
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #e74c3c, #c0392b)' }} />
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Appointment</DialogTitle>
        <DialogContent>
          {cancelTarget && (
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to cancel{' '}
              <strong>Appointment #{cancelTarget.id}</strong>
              {cancelTarget.counter ? ` (Queue #${cancelTarget.counter})` : ''}?
            </Typography>
          )}
          {cancelError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{cancelError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { setCancelTarget(null); setCancelError(''); }} variant="outlined" disabled={cancelling} sx={{ borderRadius: 2 }}>
            Keep it
          </Button>
          <Button
            onClick={handleCancel}
            variant="contained"
            color="error"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : <CancelOutlinedIcon />}
            sx={{ borderRadius: 2 }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}