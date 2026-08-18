import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TimerIcon from '@mui/icons-material/Timer';
import CommitIcon from '@mui/icons-material/Commit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BarChartIcon from '@mui/icons-material/BarChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme } from '@mui/material/styles';
import VerdictBadge from './VerdictBadge';
import VerdictCard from './VerdictCard';
import MetricsDiffTable from './MetricsDiffTable';
import ViolationsList from './ViolationsList';
import type { Run } from '@/types/run';
import { formatRelativeTime, formatBuildNumber } from '@/utils/format';
import { fontFamilyMono } from '@/config/theme';

type RunDetailProps = {
  run: Run;
};

const SectionHeader: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    {icon}
    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{children}</Typography>
  </Box>
);

const RunDetail: React.FC<RunDetailProps> = ({ run }) => {
  const theme = useTheme();

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 3, minWidth: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <VerdictBadge verdict={run.verdict} size="medium" />
          <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{run.scenarioName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.75, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: theme.palette.text.secondary }}>
            <ScheduleIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            {formatRelativeTime(run.timestamp)}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: theme.palette.text.secondary }}>
            <TimerIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            Duration:{' '}
            <Box component="code" sx={{ fontFamily: fontFamilyMono, fontSize: 11, backgroundColor: theme.palette.action.hover, px: 0.5, borderRadius: 0.5 }}>
              {run.durationSeconds}s
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: theme.palette.text.secondary }}>
            <CommitIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            Commit:{' '}
            <Box component="code" sx={{ fontFamily: fontFamilyMono, fontSize: 11, backgroundColor: theme.palette.action.hover, px: 0.5, borderRadius: 0.5 }}>
              {run.id}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: theme.palette.text.secondary }}>
            <Inventory2Icon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            Build:{' '}
            <Box component="code" sx={{ fontFamily: fontFamilyMono, fontSize: 11, backgroundColor: theme.palette.action.hover, px: 0.5, borderRadius: 0.5 }}>
              {formatBuildNumber(run.buildNumber)}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, color: theme.palette.text.secondary }}>
            <SmartToyIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            Model:{' '}
            <Box component="code" sx={{ fontFamily: fontFamilyMono, fontSize: 11, backgroundColor: theme.palette.action.hover, px: 0.5, borderRadius: 0.5 }}>
              {run.robotModel}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <VerdictCard run={run} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <SectionHeader icon={<BarChartIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />}>
          Metrics vs Previous Run
        </SectionHeader>
        <MetricsDiffTable metrics={run.metrics} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <SectionHeader icon={<WarningAmberIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />}>
          {`Violations (${run.violations.length})`}
        </SectionHeader>
        <ViolationsList violations={run.violations} />
      </Box>
    </Box>
  );
};

export default RunDetail;
