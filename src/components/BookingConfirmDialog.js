import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, IconButton, TextField, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AddIcon from '@mui/icons-material/Add';

const NOTE_MAX = 1000;

export default function BookingConfirmDialog({
  open,
  onClose,
  status = null,
  result = null,
  error = null,
  onConfirm,
  onBookAnother,
  onViewAppointments,
  onViewAppointment,
  preview = null,
  note = '',
  onNoteChange = null,
  estimatedTime = null,
}) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
    >
  <Box sx={{ height: 4, background: (theme) => theme.palette.custom ? theme.palette.custom.gradientPrimary : 'var(--gradient-primary)' }} />
      <DialogTitle sx={{ fontWeight: 700, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {status === 'success' ? 'Booking Confirmed! 🎉' : 'Confirm Appointment'}
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {status === null && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>You're about to join the queue.</Typography>
            {preview && preview.count > 0 && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,152,0,0.08)', borderRadius: 2, border: '1px solid rgba(255,152,0,0.2)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{`There ${preview.count === 1 ? 'is' : 'are'} ${preview.count} ${preview.count === 1 ? 'person' : 'people'} waiting.`}</Typography>
                <Typography variant="caption" color="text.secondary">You'll be added after them.</Typography>
                {estimatedTime && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: 'warning.main' }}>
                    ⏱ Estimated wait: ~{estimatedTime}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Collapsible Add Note Section */}
            {onNoteChange && (
              <Box sx={{ mt: 1.5 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setNoteExpanded(!noteExpanded)}
                  variant="text"
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600, mb: 1 }}
                >
                  Add Note (Optional)
                </Button>
                <Collapse in={noteExpanded}>
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Note for the staff"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value.slice(0, NOTE_MAX))}
                    inputProps={{ maxLength: NOTE_MAX }}
                    helperText={`${note.length}/${NOTE_MAX}`}
                    FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
                  />
                </Collapse>
              </Box>
            )}
          </Box>
        )}
        {status === 'loading' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary">Booking your spot…</Typography>
          </Box>
        )}
        {status === 'success' && result && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {result && result.counter ? `You're #${result.counter} in line` : "You've joined the queue"}
            </Typography>
            <Box sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, p: 2, mt: 1, textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary"><strong>Queue position:</strong> #{result?.counter ?? '-'}</Typography>
              <Typography variant="body2" color="text.secondary"><strong>Status:</strong> {result?.status ?? '-'}</Typography>
              <Typography variant="body2" color="text.secondary"><strong>Appointment ID:</strong> {result?.id ? `#${result.id}` : '-'}</Typography>
              {result?.estimated_time && (
                <Typography variant="body2" color="text.secondary"><strong>Estimated wait:</strong> {result.estimated_time}</Typography>
              )}
            </Box>
          </Box>
        )}
        {status === 'error' && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
              {error || 'Booking failed.'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', '& .MuiButton-root': { minWidth: 120, flex: '1 1 auto', whiteSpace: 'normal', textTransform: 'none' }, '@media (max-width:600px)': { '& .MuiButton-root': { flexBasis: '100%' } } }}>
        {status === null && (
          <>
            <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={onConfirm} sx={{ borderRadius: 2, color: '#fff' }}>Confirm &amp; Join Queue</Button>
          </>
        )}
        {status === 'error' && (
          <>
            {/* Close button styled as a purple outlined pill */}
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                borderRadius: 30,
                px: 4,
                 color: (theme) => theme.palette.custom ? theme.palette.custom.deepSlate : '#2D546E',
                 borderColor: 'rgba(0,0,0,0.08)',
                 '&:hover': { borderColor: 'rgba(0,0,0,0.12)' },
              }}
            >
              Close
            </Button>

            {/* If the server indicates the appointment already exists, hide Retry and show View Appointments if available. */}
            {!(error && /already exist/i.test(error)) ? (
              <Button variant="contained" color="primary" onClick={onConfirm} sx={{ borderRadius: 30, px: 4, color: '#fff' }}>Retry</Button>
            ) : (
              onViewAppointments ? (
                <Button variant="contained" color="primary" startIcon={<EventAvailableOutlinedIcon />} onClick={onViewAppointments} sx={{ borderRadius: 30, px: 4, color: '#fff' }}>View Appointments</Button>
              ) : (
                // Fallback: keep a Retry button if no view action provided
                <Button variant="contained" color="primary" onClick={onConfirm} sx={{ borderRadius: 30, px: 4, color: '#fff' }}>Retry</Button>
              )
            )}
          </>
        )}
        {status === 'success' && (
          <>
            <Button onClick={onBookAnother} variant="outlined" sx={{ borderRadius: 2 }}>Book Another</Button>
              <Button variant="contained" startIcon={<EventAvailableOutlinedIcon />} onClick={onViewAppointments} color="primary" sx={{ borderRadius: 2, px: 2, color: '#fff' }}>View Appointments</Button>
              <Button variant="contained" startIcon={<EventAvailableOutlinedIcon />} onClick={onViewAppointment} color="primary" sx={{ borderRadius: 2, px: 2, color: '#fff' }}>View Appointment</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
