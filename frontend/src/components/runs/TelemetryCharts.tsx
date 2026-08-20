import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getTelemetry } from '@/api/telemetry';
import type { TelemetryData } from '@/types/telemetry';
import { fontFamilyMono } from '@/config/theme';

type TelemetryChartsProps = {
  runId: string;
};

const COM_COLORS = ['#2196f3', '#4caf50', '#ff9800'];
const COM_LABELS = ['X', 'Y', 'Z (height)'];

const JOINT_COLORS = [
  '#e91e63', '#9c27b0', '#3f51b5', '#009688',
  '#ff5722', '#795548', '#607d8b', '#cddc39',
];

const KEY_JOINTS = [
  'right_shoulder_pitch_joint',
  'right_elbow_joint',
  'left_shoulder_pitch_joint',
  'left_elbow_joint',
  'waist_pitch_joint',
];

function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.floor(i * step)]);
  }
  if (result[result.length - 1] !== arr[arr.length - 1]) {
    result.push(arr[arr.length - 1]);
  }
  return result;
}

const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ runId }) => {
  const theme = useTheme();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTelemetry(runId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="info" sx={{ fontSize: 13 }}>No telemetry data available for this run.</Alert>;
  }

  if (!data || !data.frames || data.frames.length === 0) {
    return <Alert severity="info" sx={{ fontSize: 13 }}>Telemetry is empty.</Alert>;
  }

  const sampled = downsample(data.frames, 300);

  const comData = sampled.map((f) => ({
    t: Number(f.t.toFixed(2)),
    x: Number(f.com[0].toFixed(4)),
    y: Number(f.com[1].toFixed(4)),
    z: Number(f.com[2].toFixed(4)),
  }));

  const jointData = sampled.map((f) => {
    const row: Record<string, number> = { t: Number(f.t.toFixed(2)) };
    KEY_JOINTS.forEach((j) => {
      if (j in f.joint_angles) {
        row[j] = Number(f.joint_angles[j].toFixed(4));
      }
    });
    return row;
  });

  const contactCounts = sampled.map((f) => ({
    t: Number(f.t.toFixed(2)),
    contacts: (f.contacts ?? []).length,
  }));

  const gridColor = theme.palette.divider;
  const textColor = theme.palette.text.secondary;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: -1 }}>
        <Chip label={`${data.frame_count} frames`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
        <Chip label={`${data.sample_rate_hz} Hz`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
        <Chip label={`${data.total_duration_s.toFixed(1)}s`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
      </Box>

      <ChartCard title="Center of Mass" subtitle="Position in world frame (meters)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={comData}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              tickFormatter={(v: number) => `${v}s`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                fontSize: 12,
                fontFamily: fontFamilyMono,
              }}
              labelFormatter={(v) => `t = ${v}s`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {COM_LABELS.map((label, i) => (
              <Line
                key={label}
                type="monotone"
                dataKey={['x', 'y', 'z'][i]}
                name={label}
                stroke={COM_COLORS[i]}
                dot={false}
                strokeWidth={1.5}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Joint Angles" subtitle="Key joints (radians)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={jointData}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              tickFormatter={(v: number) => `${v}s`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              width={50}
              label={{ value: 'rad', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: textColor } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                fontSize: 11,
                fontFamily: fontFamilyMono,
              }}
              labelFormatter={(v) => `t = ${v}s`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {KEY_JOINTS.map((joint, i) => (
              <Line
                key={joint}
                type="monotone"
                dataKey={joint}
                name={joint.replace(/_joint$/, '').replace(/_/g, ' ')}
                stroke={JOINT_COLORS[i % JOINT_COLORS.length]}
                dot={false}
                strokeWidth={1.5}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Contact Events" subtitle="Active contacts per frame">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={contactCounts}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              tickFormatter={(v: number) => `${v}s`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: textColor, fontFamily: fontFamilyMono }}
              width={50}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                fontSize: 12,
                fontFamily: fontFamilyMono,
              }}
              labelFormatter={(v) => `t = ${v}s`}
            />
            <Line
              type="stepAfter"
              dataKey="contacts"
              name="Contacts"
              stroke="#f44336"
              dot={false}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </Box>
  );
};

const ChartCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 2,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.25 }}>{title}</Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>{subtitle}</Typography>
      {children}
    </Box>
  );
};

export default TelemetryCharts;
