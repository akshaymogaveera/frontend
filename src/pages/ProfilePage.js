import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { ENDPOINTS, apiCall } from '../utils/api.js';

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const showOptional = params.get('optional') === '1' || params.get('optional') === 'true';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    apiCall(ENDPOINTS.ME)
      .then((data) => {
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          city: data.city || '',
          country: data.country || '',
        });
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleChange = (k) => (ev) => setForm((s) => ({ ...s, [k]: ev.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiCall(ENDPOINTS.ME, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          city: form.city,
          country: form.country,
        }),
      });
      // persist readable name for navbar
      localStorage.setItem('firstName', data.first_name || '');
      localStorage.setItem('lastName', data.last_name || '');
      localStorage.setItem('username', data.username || localStorage.getItem('username') || 'User');
      // notify other components to refresh /api/me/
      window.dispatchEvent(new CustomEvent('sqip:login', { detail: { user: data } }));
      setSuccess('Profile updated');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Update profile
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="First name"
            value={form.first_name}
            onChange={handleChange('first_name')}
          />
          <TextField
            label="Last name"
            value={form.last_name}
            onChange={handleChange('last_name')}
          />
          <TextField label="Email" value={form.email} onChange={handleChange('email')} />
          {/* Phone intentionally hidden */}
        </Box>

        {showOptional && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Optional details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="City" value={form.city} onChange={handleChange('city')} />
              <TextField label="Country" value={form.country} onChange={handleChange('country')} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              These fields are optional and may be left blank.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default ProfilePage;
