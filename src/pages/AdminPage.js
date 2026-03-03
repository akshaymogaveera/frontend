import React, { useState, useEffect, useCallback } from 'react';
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
  Select,
  InputLabel,
  FormControl,
  Skeleton,
  Avatar,
  Badge,
  Stack,
  Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { timeOnly, formatDateTime } from '../utils/timezone.js';
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

const statusConfig = {
  active:   { label: 'Active',      bg: '#e8f5e9', text: '#2e7d32', borderColor: '#4caf50' },
  inactive: { label: 'Inactive',    bg: '#f5f5f5', text: '#616161', borderColor: '#bdbdbd' },
  checkin:  { label: 'Checked In',  bg: '#e3f2fd', text: '#1565c0', borderColor: '#42a5f5' },
  checkout: { label: 'Checked Out', bg: '#ede7f6', text: '#4527a0', borderColor: '#9575cd' },
  cancel:   { label: 'Cancelled',   bg: '#fce4ec', text: '#c62828', borderColor: '#ef9a9a' },
};

function AppointmentRow({ appt, index, totalCount, onAction, loading }) {
  const cfg = statusConfig[appt.status] || statusConfig.active;
  const canCheckin = appt.status === 'active' || appt.status === 'inactive';
  const canCheckout = appt.status === 'checkin';   // already checked-in → mark served
  const canCancel = appt.status !== 'cancel';
  const canMove = appt.status !== 'cancel' && appt.status !== 'checkin';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 1,
        borderRadius: 3,
        border: `1px solid ${cfg.borderColor}`,
        borderLeft: `4px solid ${cfg.borderColor}`,
        background: cfg.bg,
        opacity: appt.status === 'cancel' ? 0.55 : 1,
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 4px 18px rgba(0,0,0,0.09)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Queue position badge */}
        <Avatar
          sx={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {appt.is_scheduled ? '📅' : (appt.counter ?? index + 1)}
        </Avatar>

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              #{appt.id} — {appt.username || 'Unknown User'}
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
          <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonOutlineIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {appt.username || `User #${appt.user}`}
              </Typography>
            </Box>
            {appt.user_email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  ✉️ {appt.user_email}
                </Typography>
              </Box>
            )}
            {appt.user_phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  📞 {appt.user_phone}
                </Typography>
              </Box>
            )}
            {!appt.is_scheduled && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TagIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Queue {appt.counter ?? '—'}
                </Typography>
              </Box>
            )}
            {appt.scheduled_time && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                      {appt.scheduled_time_display
                        ? formatDateTime(appt.scheduled_time_display)
                        : appt.scheduled_time_with_category_tz
                        ? formatDateTime(appt.scheduled_time_with_category_tz)
                        : formatDateTime(appt.scheduled_time)}
                    </Typography>
              </Box>
            )}
            {appt.organization_name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {appt.organization_name}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Move Up */}
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
                }}
              >
                <ArrowUpwardIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Move Down */}
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

          {/* Check-In */}
          {canCheckin && (
            <Tooltip title="Check In — mark as being served">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading}
                  onClick={() => onAction('checkin', appt)}
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    borderRadius: 2,
                    fontSize: 12,
                    px: 1.5,
                    background: 'linear-gradient(45deg, #1565c0, #42a5f5)',
                    '&:hover': { background: 'linear-gradient(45deg, #0d47a1, #1e88e5)' },
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
                    background: 'linear-gradient(45deg, #2e7d32, #66bb6a)',
                    '&:hover': { background: 'linear-gradient(45deg, #1b5e20, #43a047)' },
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
                  sx={{ borderRadius: 2, fontSize: 12, px: 1.5 }}
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

function AppointmentList({ category, apptType }) {
  // apptType: 'unscheduled' | 'scheduled'
  const [appointments, setAppointments] = useState([]);
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
        setAppointments(data.results || []);
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

  const showToast = (msg, severity = 'success') => setToast({ open: true, msg, severity });

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
        showToast(
          action === 'checkin' ? '✅ Checked in' :
          action === 'checkout' ? '🏁 Checked out' :
          action === 'cancel' ? '❌ Cancelled' : '↕️ Queue updated'
        );
        fetchAppointments();
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
            '& .MuiTabs-indicator': { height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #833ab4, #fd1d1d)' },
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body2" color="text.secondary">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </Typography>
          {appointments.length > 0 && (
            <Chip
              label={appointments.length}
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

      {!loading && appointments.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <EventAvailableOutlinedIcon sx={{ fontSize: 48, opacity: 0.12, mb: 1, color: '#833ab4' }} />
          <Typography variant="body2" color="text.secondary">
            No <strong>{statusFilter}</strong> {apptType} appointments.
          </Typography>
        </Box>
      )}

      {!loading && appointments.length > 0 && (
        <Fade in timeout={250}>
          <Box>
            {appointments.map((appt, i) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                index={i}
                totalCount={appointments.length}
                onAction={handleAction}
                loading={actionLoading}
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

function CategoryPanel({ category }) {
  const [apptTab, setApptTab] = useState(0); // 0 = Unscheduled, 1 = Scheduled

  // If category explicitly indicates whether it's scheduled or not, render
  // only the appropriate appointment list (no tabs). This enforces the
  // rule that a category can only be one type.
  if (typeof category.is_scheduled === 'boolean') {
    return (
      <Box>
        {category.is_scheduled ? (
          <AppointmentList key={`${category.id}-scheduled`} category={category} apptType="scheduled" />
        ) : (
          <AppointmentList key={`${category.id}-unscheduled`} category={category} apptType="unscheduled" />
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
            background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
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
        <AppointmentList key={`${category.id}-unscheduled`} category={category} apptType="unscheduled" />
      )}
      {apptTab === 1 && (
        <AppointmentList key={`${category.id}-scheduled`} category={category} apptType="scheduled" />
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
              <AdminPanelSettingsOutlinedIcon
                sx={{ fontSize: 32, color: '#833ab4' }}
              />
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  background: 'linear-gradient(90deg, #833ab4 0%, #fd1d1d 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Admin Dashboard
              </Typography>
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
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 72, opacity: 0.15, mb: 2, color: '#833ab4' }} />
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
                      background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
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
                      '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #833ab4, #fd1d1d)', height: 3, borderRadius: 2 },
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
                      </Box>
                    </Box>

                    {/* Opening hours summary (for scheduled categories) */}
                    {currentCategory.is_scheduled && currentCategory.opening_hours && Object.keys(currentCategory.opening_hours).length > 0 && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 3,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: '#f8f5ff',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#833ab4' }}>
                          🕐 Opening Hours
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {Object.entries(currentCategory.opening_hours).map(([day, ranges]) => (
                            <Chip
                              key={day}
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
                        {currentCategory.time_interval_per_appointment && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Slot interval: {typeof currentCategory.time_interval_per_appointment === 'string'
                              ? currentCategory.time_interval_per_appointment
                              : `${currentCategory.time_interval_per_appointment} min`}
                          </Typography>
                        )}
                      </Paper>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {/* Appointments list for this category */}
                    <CategoryPanel category={currentCategory} />
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
    </Box>
  );
}
