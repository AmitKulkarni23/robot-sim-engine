import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTheme } from '@mui/material/styles';
import type { Run } from '@/types/run';
import { fontFamilyMono } from '@/config/theme';

type VerdictCardProps = {
  run: Run;
};

const VerdictCard: React.FC<VerdictCardProps> = ({ run }) => {
  const theme = useTheme();
  const isFail = run.verdict === 'fail';
  const color = isFail ? theme.palette.error : theme.palette.success;

  const stats: { label: string; value: React.ReactNode }[] = [
    { label: 'Duration', value: `${run.durationSeconds}s` },
    { label: 'Steps Simulated', value: run.stepsSimulated.toLocaleString() },
  ];
  if (run.failureAt) {
    stats.push({ label: 'Failure At', value: <Box component="span" sx={{ color: color.main }}>{run.failureAt}</Box> });
  }
  stats.push({ label: 'Violations', value: run.violations.length });

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          fontWeight: 600,
          fontSize: 14,
          backgroundColor: color.light,
          borderBottom: `1px solid ${color.dark}`,
          color: color.main,
        }}
      >
        {isFail ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
        {run.verdictReason ?? (isFail ? 'Simulation Failed' : 'Simulation Passed')}
      </Box>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {stats.map((stat) => (
          <Box key={stat.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: '0.03em' }}
            >
              {stat.label}
            </Typography>
            <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 16, fontWeight: 600 }}>{stat.value}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default VerdictCard;
