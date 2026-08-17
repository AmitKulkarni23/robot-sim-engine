import React from 'react';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import type { Verdict } from '@/types/run';
import { fontFamilyMono } from '@/config/theme';

type VerdictBadgeProps = {
  verdict: Verdict;
  size?: 'small' | 'medium';
};

const LABELS: Record<Verdict, string> = {
  pass: 'Pass',
  fail: 'Fail',
  running: 'Running',
};

const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'small' }) => {
  const theme = useTheme();
  const color =
    verdict === 'pass'
      ? theme.palette.success
      : verdict === 'fail'
        ? theme.palette.error
        : theme.palette.warning;

  return (
    <Chip
      label={LABELS[verdict]}
      size={size}
      sx={{
        fontFamily: fontFamilyMono,
        fontWeight: 600,
        fontSize: size === 'small' ? 11 : 13,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        color: color.contrastText,
        backgroundColor: color.light,
        border: `1px solid ${color.dark}`,
        borderRadius: '4px',
        height: size === 'small' ? 20 : 24,
      }}
    />
  );
};

export default VerdictBadge;
