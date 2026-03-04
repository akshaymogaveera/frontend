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
        background: 'linear-gradient(135deg, #405de6 0%, #5851db 15%, #833ab4 35%, #c13584 55%, #e1306c 75%, #fd1d1d 90%, #fcb045 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper elevation={24} sx={{ width: '100%', maxWidth: 420, borderRadius: 4, overflow: 'hidden', p: 0 }}>
        {/* Top accent bar */}
        <Box sx={{ height: 5, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)' }} />
        <LoginForm redirectFrom={from} preSelectOrg={preSelectOrg} preSelectCat={preSelectCat} />
      </Paper>
    </Box>
  );
}

export default LoginPage;