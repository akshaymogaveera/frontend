import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Paper } from '@mui/material';
import LoginForm from '../components/LoginForm.js';

function LoginPage() {
  const location = useLocation();
  const from = location.state?.from || '/';
  const preSelectOrg = location.state?.preSelectOrg || null;
  const preSelectCat = location.state?.preSelectCat || null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper elevation={24} sx={{ width: '100%', maxWidth: 420, borderRadius: 4, overflow: 'hidden', p: 0 }}>
  {/* Top accent bar */}
  <Box sx={{ height: 5, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)' }} />
        <LoginForm redirectFrom={from} preSelectOrg={preSelectOrg} preSelectCat={preSelectCat} />
      </Paper>
    </Box>
  );
}

export default LoginPage;