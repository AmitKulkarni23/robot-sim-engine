import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ScenarioStatusChip from './ScenarioStatusChip';
import { runScenario } from '@/api/scenarios';
import type { Scenario } from '@/types/scenario';
import { fontFamilyMono } from '@/config/theme';

type ScenarioRowProps = {
  scenario: Scenario;
  onStatusChange?: () => void;
};

const ScenarioRow: React.FC<ScenarioRowProps> = ({ scenario, onStatusChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunning(true);
    try {
      await runScenario(scenario.id);
      onStatusChange?.();
    } catch {
      setRunning(false);
    }
  };

  const isQueued = scenario.status === 'queued' || running;

  return (
    <Box
      onClick={() => !isQueued && navigate(`/scenarios/${scenario.id}/edit`)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        px: 2,
        py: 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        cursor: isQueued ? 'default' : 'pointer',
        opacity: isQueued ? 0.6 : 1,
        '&:hover': isQueued ? {} : { backgroundColor: theme.palette.action.hover },
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Tooltip title={isQueued ? 'Queued' : 'Run scenario'}>
          <span>
            <IconButton
              size="small"
              onClick={handleRun}
              disabled={isQueued}
              sx={{ color: isQueued ? theme.palette.text.disabled : theme.palette.primary.main }}
            >
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 13, fontWeight: 600 }}>
            {Math.round(scenario.passRate * 100)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {scenario.runCount} runs
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ScenarioRow;
