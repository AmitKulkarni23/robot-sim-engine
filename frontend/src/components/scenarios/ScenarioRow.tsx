import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ScenarioStatusChip from './ScenarioStatusChip';
import VerdictBadge from '@/components/runs/VerdictBadge';
import { getScenario, runScenario } from '@/api/scenarios';
import type { Scenario } from '@/types/scenario';
import type { Run } from '@/types/run';
import { fontFamilyMono } from '@/config/theme';
import { formatRelativeTime, formatBuildNumber } from '@/utils/format';

type ControllerVersion = 'v1' | 'v2';

type ScenarioRowProps = {
  scenario: Scenario;
  runs?: Run[];
  onStatusChange?: () => void;
};

const ScenarioRow: React.FC<ScenarioRowProps> = ({ scenario, runs = [], onStatusChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [controllerVersion, setControllerVersion] = useState<ControllerVersion>('v2');
  const [expanded, setExpanded] = useState(false);
  const [yamlContent, setYamlContent] = useState<string | null>(null);
  const [yamlLoading, setYamlLoading] = useState(false);

  useEffect(() => {
    if (!expanded || yamlContent !== null) return;
    setYamlLoading(true);
    getScenario(scenario.id)
      .then((detail) => setYamlContent(detail.yamlContent))
      .catch(() => setYamlContent(''))
      .finally(() => setYamlLoading(false));
  }, [expanded, scenario.id, yamlContent]);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunning(true);
    try {
      const result = await runScenario(scenario.id, controllerVersion);
      onStatusChange?.();
      if (result.runId) {
        navigate(`/runs/${result.runId}`);
      }
    } catch {
      setRunning(false);
    }
  };

  const handleVersionChange = (_: React.MouseEvent<HTMLElement>, value: ControllerVersion | null) => {
    if (value) setControllerVersion(value);
  };

  const isQueued = scenario.status === 'queued' || running;

  return (
    <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          px: 2,
          py: 1.5,
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={controllerVersion}
            onChange={handleVersionChange}
            onClick={(e) => e.stopPropagation()}
            disabled={isQueued}
          >
            <ToggleButton
              value="v1"
              sx={{
                fontSize: 11,
                px: 1.25,
                py: 0.375,
                fontFamily: fontFamilyMono,
                '&.Mui-selected': {
                  color: theme.palette.error.main,
                  backgroundColor: theme.palette.error.light,
                  '&:hover': { backgroundColor: theme.palette.error.light },
                },
              }}
            >
              v1 — Defective
            </ToggleButton>
            <ToggleButton
              value="v2"
              sx={{
                fontSize: 11,
                px: 1.25,
                py: 0.375,
                fontFamily: fontFamilyMono,
                '&.Mui-selected': {
                  color: theme.palette.success.main,
                  backgroundColor: theme.palette.success.light,
                  '&:hover': { backgroundColor: theme.palette.success.light },
                },
              }}
            >
              v2 — Fixed
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            size="small"
            variant="contained"
            startIcon={<PlayArrowIcon fontSize="small" />}
            onClick={handleRun}
            disabled={isQueued}
            sx={{ fontSize: 12, flexShrink: 0 }}
          >
            {isQueued ? 'Queued' : 'Run'}
          </Button>
        </Box>
      </Box>

      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          backgroundColor: theme.palette.action.hover,
          '&:hover': { backgroundColor: theme.palette.action.selected },
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: theme.palette.text.secondary,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {scenario.runCount} {scenario.runCount === 1 ? 'run' : 'runs'}
        </Typography>
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 12, fontWeight: 600, ml: 0.5 }}>
          {Math.round(scenario.passRate * 100)}% pass rate
        </Typography>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ backgroundColor: theme.palette.background.default }}>
          {yamlLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={18} />
            </Box>
          )}
          {yamlContent !== null && yamlContent !== '' && (
            <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
                Scenario YAML
              </Typography>
              <Box
                component="pre"
                sx={{
                  fontFamily: fontFamilyMono,
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  backgroundColor: theme.palette.action.hover,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 1.5,
                  m: 0,
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {yamlContent}
              </Box>
            </Box>
          )}
          {runs.length === 0 && (
            <Typography sx={{ fontSize: 12, color: 'text.disabled', px: 3, py: 1.5 }}>
              No runs yet for this scenario.
            </Typography>
          )}
          {runs.map((run) => (
            <Box
              key={run.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/runs/${run.id}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 3,
                py: 1,
                cursor: 'pointer',
                borderTop: `1px solid ${theme.palette.divider}`,
                '&:hover': { backgroundColor: theme.palette.action.hover },
              }}
            >
              <Typography
                sx={{ fontFamily: fontFamilyMono, fontSize: 11.5, color: theme.palette.primary.main, minWidth: 90 }}
              >
                {run.id}
              </Typography>
              {run.controllerVersion && (
                <Typography
                  sx={{
                    fontFamily: fontFamilyMono,
                    fontSize: 10.5,
                    fontWeight: 600,
                    px: 0.75,
                    py: 0.125,
                    borderRadius: '4px',
                    color:
                      run.controllerVersion === 'v1'
                        ? theme.palette.error.main
                        : theme.palette.success.main,
                    backgroundColor:
                      run.controllerVersion === 'v1'
                        ? theme.palette.error.light
                        : theme.palette.success.light,
                  }}
                >
                  {run.controllerVersion}
                </Typography>
              )}
              <VerdictBadge verdict={run.verdict} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 'auto' }}>
                build {formatBuildNumber(run.buildNumber)}
              </Typography>
              <Typography
                sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: theme.palette.text.disabled, minWidth: 70, textAlign: 'right' }}
              >
                {formatRelativeTime(run.timestamp)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ScenarioRow;
