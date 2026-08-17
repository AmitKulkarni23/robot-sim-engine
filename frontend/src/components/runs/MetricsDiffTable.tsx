import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme, type Theme } from '@mui/material/styles';
import type { MetricStatus, MetricValue } from '@/types/run';
import { fontFamilyMono } from '@/config/theme';

type MetricsDiffTableProps = {
  metrics: MetricValue[];
};

const rowBackground = (theme: Theme, status: MetricStatus) => {
  if (status === 'pass') return theme.palette.success.light;
  if (status === 'fail') return theme.palette.error.light;
  if (status === 'changed') return theme.palette.warning.light;
  return 'transparent';
};

const deltaColor = (theme: Theme, deltaPct: number | null) => {
  if (deltaPct === null || deltaPct === 0) return theme.palette.text.disabled;
  return deltaPct > 0 ? theme.palette.success.main : theme.palette.error.main;
};

const formatMetricValue = (value: number, unit: string) => (unit ? `${value} ${unit}` : `${value}`);

const MetricsDiffTable: React.FC<MetricsDiffTableProps> = ({ metrics }) => {
  const theme = useTheme();

  if (metrics.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No metrics recorded for this run yet.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell>Current</TableCell>
            <TableCell>Previous</TableCell>
            <TableCell>Delta</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.map((metric) => (
            <TableRow key={metric.name} sx={{ backgroundColor: rowBackground(theme, metric.status) }}>
              <TableCell sx={{ fontWeight: 500 }}>{metric.name}</TableCell>
              <TableCell sx={{ fontFamily: fontFamilyMono, fontSize: 12 }}>
                {formatMetricValue(metric.current, metric.unit)}
              </TableCell>
              <TableCell sx={{ fontFamily: fontFamilyMono, fontSize: 12, color: theme.palette.text.disabled }}>
                {metric.previous === null ? '—' : formatMetricValue(metric.previous, metric.unit)}
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: fontFamilyMono,
                  fontSize: 12,
                  fontWeight: 500,
                  color: deltaColor(theme, metric.deltaPct),
                }}
              >
                {metric.deltaPct === null ? '—' : `${metric.deltaPct > 0 ? '+' : ''}${metric.deltaPct}%`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MetricsDiffTable;
