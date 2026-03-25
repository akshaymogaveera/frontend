import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginModal } from '../contexts/LoginModalContext.js';
import { ENDPOINTS, apiCall } from '../utils/api.js';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin } = useLoginModal();
  const [anchorEl, setAnchorEl] = useState(null);
  const avatarRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'));
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const username = localStorage.getItem('username') || 'User';
  const displayName = firstName || lastName ? `${firstName} ${lastName}`.trim() : username;
  const [isAdmin, setIsAdmin] = useState(() => {
    const staff = localStorage.getItem('isStaff') === 'true';
    const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
    const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';
    return staff || groups.length > 0 || isOrgAdmin;
  });

  // Fetch /api/me/ once per mount to refresh admin state
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    apiCall(ENDPOINTS.ME)
      .then((data) => {
        localStorage.setItem('isStaff', data.is_staff || data.is_superuser ? 'true' : 'false');
        localStorage.setItem('userGroups', JSON.stringify(data.groups || []));
        // Persist org-admin flags for frontend admin UX
        localStorage.setItem('isOrgAdmin', data.is_org_admin ? 'true' : 'false');
        localStorage.setItem('orgAccess', JSON.stringify(data.org_access || []));
        // persist readable name parts for navbar and other UI
        localStorage.setItem('firstName', data.first_name || '');
        localStorage.setItem('lastName', data.last_name || '');
        setIsAdmin(
          data.is_staff ||
            data.is_superuser ||
            (data.groups && data.groups.length > 0) ||
            data.is_org_admin
        );
        setIsLoggedIn(true);
      })
      .catch(() => {
        // Network or other error -> do not assume logged-in
        localStorage.clear();
        setIsLoggedIn(false);
        setIsAdmin(false);
      });
  }, []);

  // Listen for global auth events to update navbar immediately after login/logout
  useEffect(() => {
    const onLogin = async () => {
      try {
        console.debug('[Navbar] sqip:login received, refreshing /api/me');
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          return;
        }
        const res = await fetch('/api/me/', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          localStorage.clear();
          setIsLoggedIn(false);
          setIsAdmin(false);
          setAnchorEl(null);
          return;
        }
        const data = await res.json();
        localStorage.setItem('isStaff', data.is_staff || data.is_superuser ? 'true' : 'false');
        localStorage.setItem('userGroups', JSON.stringify(data.groups || []));
        localStorage.setItem('isOrgAdmin', data.is_org_admin ? 'true' : 'false');
        localStorage.setItem('orgAccess', JSON.stringify(data.org_access || []));
        localStorage.setItem('firstName', data.first_name || '');
        localStorage.setItem('lastName', data.last_name || '');
        const staff = data.is_staff || data.is_superuser;
        const groups = data.groups || [];
        const isOrg = data.is_org_admin;
        setIsAdmin(staff || groups.length > 0 || isOrg);
        setIsLoggedIn(true);
        setAnchorEl(null);
      } catch (e) {
        console.debug('[Navbar] onLogin fetch failed', e);
        // Fallback to reading localStorage
        const staff = localStorage.getItem('isStaff') === 'true';
        const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
        const isOrgAdmin = localStorage.getItem('isOrgAdmin') === 'true';
        setIsAdmin(staff || groups.length > 0 || isOrgAdmin);
        setIsLoggedIn(!!localStorage.getItem('accessToken'));
        setAnchorEl(null);
      }
    };
    const onLogout = () => {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setAnchorEl(null);
    };
    window.addEventListener('sqip:login', onLogin);
    // Also respond to the post-login event some components emit
    window.addEventListener('sqip:postLogin', onLogin);
    window.addEventListener('sqip:logout', onLogout);
    return () => {
      window.removeEventListener('sqip:login', onLogin);
      window.removeEventListener('sqip:logout', onLogout);
    };
  }, []);

  // Debug: log when the menu anchor changes (helps trace unexpected opens)
  useEffect(() => {
    if (anchorEl) {
      try {
        console.debug(
          '[Navbar] menu anchor set. element:',
          anchorEl,
          'rect:',
          anchorEl.getBoundingClientRect()
        );
      } catch (err) {
        console.debug('[Navbar] menu anchor set (non-element):', anchorEl);
      }
    } else {
      console.debug('[Navbar] menu anchor cleared');
    }
  }, [anchorEl]);

  // Use a stable ref for the avatar button so the Menu always anchors to
  // the intended element. Some browsers or event compositions can cause
  // currentTarget to be different than expected; using a ref makes the
  // behaviour deterministic and avoids the menu appearing in the wrong
  // position (for example, top-left of the viewport).
  const handleMenuOpen = (e) => {
    // Only open the profile menu if the user is logged in and the avatar exists.
    if (!isLoggedIn) return;
    setAnchorEl(avatarRef.current || e.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    // notify other parts of app
    window.dispatchEvent(new Event('sqip:logout'));
    navigate('/');
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeOutlinedIcon sx={{ fontSize: 20 }} />, public: true },
    ...(isLoggedIn
      ? [
          {
            label: 'Appointments',
            path: '/appointments',
            icon: <EventNoteOutlinedIcon sx={{ fontSize: 20 }} />,
            public: false,
          },
        ]
      : []),
    ...(isLoggedIn && isAdmin
      ? [
          {
            label: 'Admin',
            path: '/admin',
            icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />,
            public: false,
          },
        ]
      : []),
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ maxWidth: 1100, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
        {/* Logo */}
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            cursor: 'pointer',
            flexGrow: { xs: 1, sm: 0 },
            mr: { sm: 4 },
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: (theme) =>
                `0 2px 8px ${theme.palette.custom ? 'rgba(130,172,87,0.14)' : 'rgba(0,0,0,0.08)'}`,
              background: (theme) =>
                theme.palette.custom
                  ? theme.palette.custom.green || '#82ac57'
                  : '#82ac57',
            }}
          >
            <EventNoteOutlinedIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: -0.5,
                color: 'text.primary',
                lineHeight: 1.1,
              }}
            >
              sqip
            </Typography>
            <Typography
              sx={{
                fontWeight: 400,
                fontSize: 10,
                letterSpacing: 0.3,
                color: 'text.secondary',
                textTransform: 'lowercase',
                lineHeight: 1,
              }}
            >
              skip the queue
            </Typography>
          </Box>
        </Box>

        {/* Nav Links */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, flexGrow: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  fontWeight: active ? 700 : 500,
                  color: active ? 'text.primary' : 'text.secondary',
                  borderRadius: 3,
                  px: 2,
                  py: 0.75,
                  background: active
                    ? (theme) =>
                        theme.palette.custom ? theme.palette.custom.mint : 'rgba(0,196,204,0.08)'
                    : 'transparent',
                  '&:hover': {
                    background: (theme) =>
                      theme.palette.custom ? theme.palette.custom.mint : 'rgba(0,196,204,0.06)',
                    color: 'text.primary',
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        {/* Mobile nav icons */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 0.5 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <IconButton
                key={item.path}
                onClick={() => navigate(item.path)}
                size="small"
                sx={{
                  color: active ? 'primary.main' : 'text.secondary',
                  background: active ? 'rgba(131,58,180,0.08)' : 'transparent',
                }}
              >
                {item.icon}
              </IconButton>
            );
          })}
        </Box>

        {/* User avatar or Login button */}
        {isLoggedIn ? (
          <>
            <Tooltip title={displayName}>
              <IconButton ref={avatarRef} onClick={handleMenuOpen} sx={{ ml: 1 }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    background: (theme) =>
                      theme.palette.custom
                        ? theme.palette.custom.gradientPrimary
                        : 'linear-gradient(135deg,#00C4CC,#007BFF)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 4,
                sx: {
                  borderRadius: 3,
                  minWidth: 180,
                  mt: 1,
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountCircleOutlinedIcon color="action" />
                  <Typography variant="body2" fontWeight={600}>
                    {displayName}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  navigate('/profile?optional=1');
                  handleMenuClose();
                }}
                sx={{ gap: 1.5, py: 1 }}
              >
                <AccountCircleOutlinedIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">Update profile</Typography>
              </MenuItem>
              <Divider />
              {navItems
                .filter((item) => !item.public)
                .map((item) => (
                  <MenuItem
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      handleMenuClose();
                    }}
                    sx={{ gap: 1.5, py: 1 }}
                  >
                    {item.icon}
                    <Typography variant="body2">{item.label}</Typography>
                  </MenuItem>
                ))}
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1, color: 'error.main' }}>
                <LogoutIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={() => openLogin({ from: location.pathname })}
            sx={{ ml: 2, borderRadius: 2, px: 3 }}
          >
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
