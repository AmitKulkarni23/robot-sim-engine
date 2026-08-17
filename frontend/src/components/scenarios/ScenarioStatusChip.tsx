import React from 'react';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import type { ScenarioStatus } from '@/types/scenario';
import { fontFamilyMono } from '@/config/theme';

type ScenarioStatusChipProps = {
  status: ScenarioStatus;
};

const LABELS: Record<ScenarioStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const ScenarioStatusChip: React.FC<ScenarioStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const color =
    status === 'published'
      ? theme.palette.success
      : status === 'draft'
        ? theme.palette.warning
        : theme.palette.text;

  const backgroundColor = status === 'archived' ? theme.palette.action.hover : color.light;
  const borderColor = status === 'archived' ? theme.palette.divider : color.dark;
  const textColor = status === 'archived' ? theme.palette.text.secondary : color.main;

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
