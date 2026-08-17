import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ScenarioStatusChip from './ScenarioStatusChip';
import type { Scenario } from '@/types/scenario';
import { fontFamilyMono } from '@/config/theme';

type ScenarioRowProps = {
  scenario: Scenario;
};

const ScenarioRow: React.FC<ScenarioRowProps> = ({ scenario }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        px: 2,
        py: 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{scenario.name}</Typography>
          <ScenarioStatusChip status={scenario.status} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: 12.5 }}>
          {scenario.description}
        </Typography>
        <Typography
          sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: theme.palette.text.disabled, mt: 0.5 }}
        >
          {scenario.robotModel}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 13, fontWeight: 600 }}>
          {Math.round(scenario.passRate * 100)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {scenario.runCount} runs
        </Typography>
      </Box>
    </Box>
  );
};

export default ScenarioRow;
