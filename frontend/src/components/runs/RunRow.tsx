import React from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import VerdictBadge from './VerdictBadge';
import type { Run } from '@/types/run';
import { formatRelativeTime, formatBuildNumber } from '@/utils/format';
import { fontFamilyMono } from '@/config/theme';

type RunRowProps = {
  run: Run;
  selected: boolean;
  onSelect: (runId: string) => void;
};

const deltaColor = (theme: ReturnType<typeof useTheme>, direction: Run['keyMetricDeltaDirection']) => {
  if (direction === 'pos') return theme.palette.success.main;
  if (direction === 'neg') return theme.palette.error.main;
  return theme.palette.text.disabled;
};

const indicatorColor = (theme: ReturnType<typeof useTheme>, verdict: Run['verdict']) => {
  if (verdict === 'pass') return theme.palette.success.main;
  if (verdict === 'fail') return theme.palette.error.main;
  return theme.palette.warning.main;
};

const RunRow: React.FC<RunRowProps> = ({ run, selected, onSelect }) => {
  const theme = useTheme();

  return (
    <ButtonBase
      onClick={() => onSelect(run.id)}
      aria-label={`${run.scenarioName} — ${run.id}`}
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'stretch',
        gap: 1.25,
        px: selected ? 1.75 : 2,
        py: 1.25,
        textAlign: 'left',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: selected ? theme.palette.action.selected : 'transparent',
        borderLeft: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      }}
    >
      <Box
        sx={{
          width: 3,
          borderRadius: 1,
          my: 0.25,
          backgroundColor: indicatorColor(theme, run.verdict),
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="span"
            sx={{ fontFamily: fontFamilyMono, fontSize: 12, color: theme.palette.primary.main, fontWeight: 500 }}
          >
            {run.id}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {run.scenarioName}
          </Typography>
          <Box sx={{ ml: 'auto', flexShrink: 0 }}>
            <VerdictBadge verdict={run.verdict} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.375 }}>
          <Typography
            component="span"
            sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: theme.palette.text.disabled }}
          >
            {formatRelativeTime(run.timestamp)}
          </Typography>
          <Typography component="span" sx={{ fontSize: 11, color: theme.palette.text.secondary }}>
            build {formatBuildNumber(run.buildNumber)}
          </Typography>
          <Typography
            component="span"
            sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: deltaColor(theme, run.keyMetricDeltaDirection) }}
          >
            {run.keyMetricLabel}
          </Typography>
        </Box>
      </Box>
    </ButtonBase>
  );
};

export default RunRow;
