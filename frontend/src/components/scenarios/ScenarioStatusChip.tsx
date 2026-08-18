import React from 'react';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import type { PaletteColor } from '@mui/material/styles';
import type { ScenarioStatus } from '@/types/scenario';
import { fontFamilyMono } from '@/config/theme';

type ScenarioStatusChipProps = {
  status: ScenarioStatus;
};

const LABELS: Record<ScenarioStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  queued: 'Queued',
  completed: 'Completed',
};

const ScenarioStatusChip: React.FC<ScenarioStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const paletteColor: PaletteColor =
    status === 'published' || status === 'completed'
      ? theme.palette.success
      : status === 'draft'
        ? theme.palette.warning
        : status === 'queued'
          ? theme.palette.info
          : theme.palette.info;

  const backgroundColor = status === 'archived' ? theme.palette.action.hover : paletteColor.light;
  const borderColor = status === 'archived' ? theme.palette.divider : paletteColor.dark;
  const textColor = status === 'archived' ? theme.palette.text.secondary : paletteColor.main;

  return (
    <Chip
      label={LABELS[status]}
      size="small"
      sx={{
        fontFamily: fontFamilyMono,
        fontWeight: 600,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        color: textColor,
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        height: 20,
      }}
    />
  );
};

export default ScenarioStatusChip;
