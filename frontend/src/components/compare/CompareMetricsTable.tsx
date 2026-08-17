import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { Run } from '@/types/run';
import { classifyDelta } from '@/utils/format';
import { fontFamilyMono } from '@/config/theme';

type CompareMetricsTableProps = {
  baseline: Run;
  candidate: Run;
};

const computeDeltaPct = (baselineValue: number, candidateValue: number): number | null => {
  if (baselineValue === 0) return null;
  return Math.round(((candidateValue - baselineValue) / baselineValue) * 1000) / 10;
};

const CompareMetricsTable: React.FC<CompareMetricsTableProps> = ({ baseline, candidate }) => {
  const theme = useTheme();

  const metricNames = Array.from(
    new Set([...baseline.metrics.map((m) => m.name), ...candidate.metrics.map((m) => m.name)])
  );

  if (metricNames.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No overlapping metrics recorded for these runs.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell>{`Baseline (${baseline.id})`}</TableCell>
            <TableCell>{`Candidate (${candidate.id})`}</TableCell>
            <TableCell>Delta</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metricNames.map((name) => {
            const baselineMetric = baseline.metrics.find((m) => m.name === name);
            const candidateMetric = candidate.metrics.find((m) => m.name === name);
            const deltaPct =
              baselineMetric && candidateMetric
                ? computeDeltaPct(baselineMetric.current, candidateMetric.current)
                : null;
            const direction = classifyDelta(deltaPct);
            const deltaColor =
              direction === 'pos'
                ? theme.palette.success.main
                : direction === 'neg'
                  ? theme.palette.error.main
                  : theme.palette.text.disabled;

            return (
              <TableRow key={name}>
                <TableCell sx={{ fontWeight: 500 }}>{name}</TableCell>
                <TableCell sx={{ fontFamily: fontFamilyMono, fontSize: 12 }}>
                  {baselineMetric ? `${baselineMetric.current} ${baselineMetric.unit}`.trim() : '—'}
                </TableCell>
                <TableCell sx={{ fontFamily: fontFamilyMono, fontSize: 12 }}>
                  {candidateMetric ? `${candidateMetric.current} ${candidateMetric.unit}`.trim() : '—'}
                </TableCell>
                <TableCell sx={{ fontFamily: fontFamilyMono, fontSize: 12, fontWeight: 500, color: deltaColor }}>
                  {deltaPct === null ? '—' : `${deltaPct > 0 ? '+' : ''}${deltaPct}%`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CompareMetricsTable;
