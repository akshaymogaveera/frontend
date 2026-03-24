import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = '',
  onClose = () => {},
  onConfirm = () => {},
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  loading = false,
}) {
  return (
    <Dialog open={Boolean(open)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
        {title}
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">{message}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>{cancelLabel}</Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ borderRadius: 2 }} disabled={loading}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
