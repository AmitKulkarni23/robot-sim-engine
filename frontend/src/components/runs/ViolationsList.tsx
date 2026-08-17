import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { Violation } from '@/types/run';
import { fontFamilyMono } from '@/config/theme';

type ViolationsListProps = {
  violations: Violation[];
};

const ViolationsList: React.FC<ViolationsListProps> = ({ violations }) => {
  const theme = useTheme();

  if (violations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No violations recorded for this run.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {violations.map((violation) => {
        const color = violation.severity === 'error' ? theme.palette.error : theme.palette.warning;
        return (
          <Box
            key={violation.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.5,
              py: 1,
              border: `1px solid ${color.dark}`,
              borderRadius: 1.5,
              backgroundColor: color.light,
            }}
          >
            <Chip
              label={violation.severity === 'error' ? 'Error' : 'Warn'}
              size="small"
              sx={{
                fontFamily: fontFamilyMono,
                fontSize: 11,
                fontWeight: 600,
                height: 18,
                borderRadius: '3px',
                color: theme.palette.getContrastText(color.main),
                backgroundColor: color.main,
                mt: 0.25,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{violation.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                {violation.description}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }}>
              {violation.timeLabel}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default ViolationsList;
