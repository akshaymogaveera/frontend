import React, { createContext, useContext, useState } from 'react';
import { Dialog, IconButton, Box, useMediaQuery, useTheme, Grow, Slide, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoginForm from '../components/LoginForm.js';

const LoginModalContext = createContext(null);

export function useLoginModal() {
  return useContext(LoginModalContext);
}

export function LoginModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  const openLogin = (p = {}) => {
    setPayload(p);
    setOpen(true);
  };

  const closeLogin = () => {
    setOpen(false);
    setPayload(null);
  };

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <LoginModalContext.Provider value={{ open, payload, openLogin, closeLogin }}>
      {children}

      <Dialog
        open={open}
        onClose={closeLogin}
        fullScreen={false}
        fullWidth
        maxWidth={fullScreen ? false : 'sm'}
        TransitionComponent={fullScreen ? Slide : Grow}
        transitionDuration={240}
        SlideProps={fullScreen ? { direction: 'up' } : undefined}
        scroll="body"
        PaperProps={{
          sx: fullScreen
            ? {
                // Mobile: centered card with breathing room on all sides
                m: '24px 16px',
                width: 'calc(100% - 32px)',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 48px)',
                overflowY: 'auto',
                borderRadius: '20px',
                bgcolor: 'background.paper',
                boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              }
            : {
                // Desktop: transparent shell — inner Paper provides the card
                bgcolor: 'transparent',
                boxShadow: 'none',
                p: 0,
                m: 0,
                maxHeight: 'none',
                overflow: 'visible',
              },
        }}
        BackdropProps={{ sx: { bgcolor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' } }}
        sx={fullScreen ? { '& .MuiDialog-container': { alignItems: 'center' } } : {}}
      >
        {fullScreen ? (
          /* ── Mobile centered card ── */
          <Box>
            {/* Gradient accent bar at top */}
            <Box sx={{ height: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', borderRadius: '20px 20px 0 0' }} />
            {/* Close button */}
            <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1201 }}>
              <IconButton onClick={closeLogin} size="small" aria-label="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <LoginForm
              redirectFrom={payload?.from}
              preSelectOrg={payload?.preSelectOrg}
              preSelectCat={payload?.preSelectCat}
              onClose={closeLogin}
              isMobileSheet
            />
          </Box>
        ) : (
          /* ── Desktop card ── */
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Paper elevation={24} sx={{ width: '100%', maxWidth: 420, borderRadius: 4, overflow: 'hidden', p: 0 }}>
              <Box sx={{ height: 5, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)' }} />
              {/* Close button */}
              <Box sx={{ position: 'absolute', right: 12, top: 12, zIndex: 1201 }}>
                <IconButton onClick={closeLogin} size="large" aria-label="Close login dialog">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <LoginForm
                redirectFrom={payload?.from}
                preSelectOrg={payload?.preSelectOrg}
                preSelectCat={payload?.preSelectCat}
                onClose={closeLogin}
              />
            </Paper>
          </Box>
        )}
      </Dialog>
    </LoginModalContext.Provider>
  );
}

export default LoginModalContext;
