export interface TelemetryFrame {
  t: number;
  joint_angles: Record<string, number>;
  joint_velocities: Record<string, number>;
  body_positions: Record<string, [number, number, number]>;
  com: [number, number, number];
  contacts: Array<{
    body_a: string;
    body_b: string;
    position: [number, number, number];
  }>;
}

export interface TelemetryData {
  sample_rate_hz: number;
  total_duration_s: number;
  frame_count: number;
  frames: TelemetryFrame[];
}
