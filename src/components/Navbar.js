import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginModal } from '../contexts/LoginModalContext.js';
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
  useScrollTrigger,
  Slide,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

function HideOnScroll({ children }) {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

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
  const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : username;
  const [isAdmin, setIsAdmin] = useState(() => {
    const staff = localStorage.getItem('isStaff') === 'true';
    const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
    return staff || groups.length > 0;
  });

  // Fetch /api/me/ once per mount to refresh admin state
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch('/api/me/', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) {
          // Token invalid or expired -> treat as logged out
          localStorage.clear();
          setIsLoggedIn(false);
          setIsAdmin(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          localStorage.setItem('isStaff', data.is_staff || data.is_superuser ? 'true' : 'false');
          localStorage.setItem('userGroups', JSON.stringify(data.groups || []));
          // persist readable name parts for navbar and other UI
          localStorage.setItem('firstName', data.first_name || '');
          localStorage.setItem('lastName', data.last_name || '');
          setIsAdmin(data.is_staff || data.is_superuser || (data.groups && data.groups.length > 0));
          setIsLoggedIn(true);
        }
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
    const onLogin = () => {
      console.debug('[Navbar] sqip:login received, accessToken present:', !!localStorage.getItem('accessToken'));
      setIsLoggedIn(!!localStorage.getItem('accessToken'));
      const staff = localStorage.getItem('isStaff') === 'true';
      const groups = JSON.parse(localStorage.getItem('userGroups') || '[]');
      setIsAdmin(staff || groups.length > 0);
      // Ensure any open profile menu is closed when login events occur.
      setAnchorEl(null);
    };
    const onLogout = () => {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setAnchorEl(null);
    };
    window.addEventListener('sqip:login', onLogin);
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
        console.debug('[Navbar] menu anchor set. element:', anchorEl, 'rect:', anchorEl.getBoundingClientRect());
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
    ...(isLoggedIn ? [
      { label: 'Appointments', path: '/appointments', icon: <EventNoteOutlinedIcon sx={{ fontSize: 20 }} />, public: false },
    ] : []),
    ...(isLoggedIn && isAdmin ? [{ label: 'Admin', path: '/admin', icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />, public: false }] : []),
  ];

  return (
    <HideOnScroll>
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
              gap: 1,
              cursor: 'pointer',
              flexGrow: { xs: 1, sm: 0 },
              mr: { sm: 4 },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(131,58,180,0.3)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>
                S
              </Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: -0.5,
                background: 'linear-gradient(90deg, #833ab4, #fd1d1d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              sqip
            </Typography>
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
                    color: active ? 'primary.main' : 'text.secondary',
                    borderRadius: 3,
                    px: 2,
                    py: 0.75,
                    background: active ? 'rgba(131,58,180,0.08)' : 'transparent',
                    '&:hover': {
                      background: 'rgba(131,58,180,0.06)',
                      color: 'primary.main',
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
                      background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
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
                    <Typography variant="body2" fontWeight={600}>{displayName}</Typography>
                  </Box>
                </Box>
                <Divider />
                {navItems.filter(item => !item.public).map((item) => (
                  <MenuItem
                    key={item.path}
                    onClick={() => { navigate(item.path); handleMenuClose(); }}
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
              onClick={() => openLogin({ from: location.pathname })}
              sx={{
                ml: 2,
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(45deg, #833ab4, #fd1d1d)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #6a2d9f, #c40000)',
                },
              }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </HideOnScroll>
  );
}

export default Navbar;
