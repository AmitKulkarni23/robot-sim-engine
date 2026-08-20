import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import TopBar from '@/components/layout/TopBar';
import { useTour } from '@/hooks/useTour';
import { TOUR_IDS, factoryFloorTourSteps } from '@/tours';
import { fontFamilyMono } from '@/config/theme';

const VIEW = { minX: -3, maxX: 10, minY: -4, maxY: 4 };
const RANGE_X = VIEW.maxX - VIEW.minX;
const RANGE_Y = VIEW.maxY - VIEW.minY;
const ASPECT = RANGE_X / RANGE_Y;

const SVG_W = 800;
const SVG_H = SVG_W / ASPECT;
const PAD = 50;
const DRAW_W = SVG_W - PAD * 2;
const DRAW_H = SVG_H - PAD * 2;
const SCALE_X = DRAW_W / RANGE_X;
const SCALE_Y = DRAW_H / RANGE_Y;

function toSvg(wx: number, wy: number) {
  return {
    sx: PAD + (wx - VIEW.minX) * SCALE_X,
    sy: PAD + (VIEW.maxY - wy) * SCALE_Y,
  };
}
function mToPxX(m: number) { return m * SCALE_X; }
function mToPxY(m: number) { return m * SCALE_Y; }

const HOVER_STYLE: React.CSSProperties = { cursor: 'pointer' };

const FactoryFloorPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const pageTour = useTour({
    tourId: TOUR_IDS.FACTORY_FLOOR,
    steps: factoryFloorTourSteps,
    autoStartDelay: 600,
  });

  const gridColor = isDark ? '#2a2a3e' : '#ccc';
  const floorColor = isDark ? '#1a1a2e' : '#f5f5f0';
  const labelColor = theme.palette.text.secondary;
  const zoneStroke = isDark ? '#334' : '#bbb';
  const zoneFill = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const laneColor = isDark ? '#2a3a5a' : '#c8d8f0';
  const wallColor = isDark ? '#444' : '#888';

  const tableColor = '#8B6914';
  const shelfColor = '#666688';
  const palletColor = '#557744';

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'factory-floor']} onStartTour={() => {
        pageTour.reset();
        pageTour.startTour();
      }} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>Factory Floor</Typography>

          <Box data-tour="floor-svg" sx={{ border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.paper', overflow: 'hidden' }}>
            <style>{`
              .floor-obj:hover { opacity: 1 !important; filter: brightness(1.2); }
            `}</style>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block' }}>

              {/* Floor */}
              <rect x={PAD} y={PAD} width={DRAW_W} height={DRAW_H} fill={floorColor} rx={4} />

              {/* Checker */}
              <defs>
                <pattern id="checker" width={mToPxX(2)} height={mToPxY(2)} patternUnits="userSpaceOnUse"
                  x={toSvg(0, 0).sx} y={toSvg(0, 0).sy}>
                  <rect width={mToPxX(1)} height={mToPxY(1)} fill={isDark ? '#1e1e32' : '#e8e8e0'} />
                  <rect x={mToPxX(1)} y={mToPxY(1)} width={mToPxX(1)} height={mToPxY(1)} fill={isDark ? '#1e1e32' : '#e8e8e0'} />
                </pattern>
              </defs>
              <rect x={PAD} y={PAD} width={DRAW_W} height={DRAW_H} fill="url(#checker)" rx={4} />

              {/* Main walkway lane */}
              {(() => {
                const { sy: y1 } = toSvg(0, 0.6);
                const { sy: y2 } = toSvg(0, -0.6);
                const { sx: x1 } = toSvg(-2, 0);
                const { sx: x2 } = toSvg(9, 0);
                return <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={laneColor} opacity={0.4} />;
              })()}

              {/* Lane dashes */}
              {Array.from({ length: 12 }, (_, i) => {
                const wx = -2 + i * 1;
                const { sx, sy } = toSvg(wx, 0);
                return <line key={`dash-${i}`} x1={sx} y1={sy - 2} x2={sx + mToPxX(0.5)} y2={sy - 2}
                  stroke={isDark ? '#556' : '#99b'} strokeWidth={1.5} strokeDasharray="4 4" />;
              })}

              {/* Staging area */}
              {(() => {
                const { sx, sy } = toSvg(-2, 2);
                const w = mToPxX(2.5);
                const h = mToPxY(4);
                return (
                  <g>
                    <rect x={sx} y={sy} width={w} height={h} fill={zoneFill} stroke={zoneStroke} strokeWidth={1} strokeDasharray="6 3" rx={4} />
                    <text x={sx + w / 2} y={sy + 14} textAnchor="middle" fontSize={10} fill={labelColor} fontWeight={600}>STAGING AREA</text>
                  </g>
                );
              })()}

              {/* Pickup zone */}
              {(() => {
                const { sx, sy } = toSvg(-1.5, 1.2);
                const w = mToPxX(3.2);
                const h = mToPxY(2.4);
                return (
                  <g>
                    <rect x={sx} y={sy} width={w} height={h} fill={isDark ? 'rgba(139,105,20,0.08)' : 'rgba(139,105,20,0.06)'} stroke="#8B6914" strokeWidth={1} strokeDasharray="6 3" rx={4} />
                    <text x={sx + w / 2} y={sy + 14} textAnchor="middle" fontSize={10} fill="#8B6914" fontWeight={600}>PICKUP ZONE</text>
                  </g>
                );
              })()}

              {/* Obstacle corridor */}
              {(() => {
                const { sx, sy } = toSvg(1.2, 1.2);
                const w = mToPxX(5.5);
                const h = mToPxY(2.4);
                return (
                  <g>
                    <rect x={sx} y={sy} width={w} height={h} fill={isDark ? 'rgba(255,128,0,0.05)' : 'rgba(255,128,0,0.04)'} stroke="#FF8000" strokeWidth={1} strokeDasharray="6 3" rx={4} />
                    <text x={sx + w / 2} y={sy + 14} textAnchor="middle" fontSize={10} fill="#FF8000" fontWeight={600}>OBSTACLE CORRIDOR</text>
                  </g>
                );
              })()}

              {/* Grid */}
              {Array.from({ length: RANGE_X + 1 }, (_, i) => {
                const worldVal = VIEW.minX + i;
                const { sx } = toSvg(worldVal, 0);
                return (
                  <g key={`gx-${i}`}>
                    <line x1={sx} y1={PAD} x2={sx} y2={PAD + DRAW_H} stroke={gridColor} strokeWidth={worldVal === 0 ? 1.5 : 0.3} />
                    <text x={sx} y={SVG_H - 10} textAnchor="middle" fontSize={10} fill={labelColor} fontFamily="monospace">{worldVal}m</text>
                  </g>
                );
              })}
              {Array.from({ length: RANGE_Y + 1 }, (_, i) => {
                const worldVal = VIEW.minY + i;
                const { sy } = toSvg(0, worldVal);
                return (
                  <g key={`gy-${i}`}>
                    <line x1={PAD} y1={sy} x2={PAD + DRAW_W} y2={sy} stroke={gridColor} strokeWidth={worldVal === 0 ? 1.5 : 0.3} />
                    <text x={16} y={sy + 4} textAnchor="middle" fontSize={10} fill={labelColor} fontFamily="monospace">{worldVal}m</text>
                  </g>
                );
              })}

              {/* Walls */}
              {(() => {
                const nw = toSvg(-2.5, 3.5);
                const ne = toSvg(9.5, 3.5);
                const sw = toSvg(-2.5, -3.5);
                const se = toSvg(9.5, -3.5);
                const dockTop = toSvg(9.5, 1);
                const dockBot = toSvg(9.5, -1);
                return (
                  <g>
                    <line x1={nw.sx} y1={nw.sy} x2={ne.sx} y2={ne.sy} stroke={wallColor} strokeWidth={3} />
                    <line x1={sw.sx} y1={sw.sy} x2={se.sx} y2={se.sy} stroke={wallColor} strokeWidth={3} />
                    <line x1={nw.sx} y1={nw.sy} x2={sw.sx} y2={sw.sy} stroke={wallColor} strokeWidth={3} />
                    <line x1={ne.sx} y1={ne.sy} x2={dockTop.sx} y2={dockTop.sy} stroke={wallColor} strokeWidth={3} />
                    <line x1={dockBot.sx} y1={dockBot.sy} x2={se.sx} y2={se.sy} stroke={wallColor} strokeWidth={3} />
                    <text x={ne.sx + 8} y={(dockTop.sy + dockBot.sy) / 2 + 4} fontSize={9} fill={labelColor} fontWeight={600} writingMode="tb">DOCK</text>
                  </g>
                );
              })()}

              {/* Storage racks */}
              {[0, 2, 4].map((xOff) => {
                const { sx, sy } = toSvg(xOff + 0.5, -2);
                const w = mToPxX(1.5);
                const h = mToPxY(0.6);
                return (
                  <g key={`rack-${xOff}`} className="floor-obj" style={HOVER_STYLE}>
                    <title>Storage Rack ({xOff + 0.5}m, -2m)</title>
                    <rect x={sx} y={sy} width={w} height={h} fill={isDark ? '#3a3a4a' : '#aaa'} opacity={0.5} rx={2} stroke={isDark ? '#555' : '#888'} strokeWidth={1} />
                    <line x1={sx + w * 0.33} y1={sy} x2={sx + w * 0.33} y2={sy + h} stroke={isDark ? '#555' : '#999'} strokeWidth={0.5} />
                    <line x1={sx + w * 0.66} y1={sy} x2={sx + w * 0.66} y2={sy + h} stroke={isDark ? '#555' : '#999'} strokeWidth={0.5} />
                  </g>
                );
              })}
              {(() => {
                const { sx } = toSvg(2.5, 0);
                const { sy } = toSvg(0, -2);
                return <text x={sx} y={sy + mToPxY(0.6) + 14} textAnchor="middle" fontSize={10} fill={labelColor} fontWeight={600}>STORAGE RACKS</text>;
              })()}

              {/* Conveyor belt */}
              {(() => {
                const { sx, sy } = toSvg(2, 2.8);
                const w = mToPxX(5);
                const h = mToPxY(0.4);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Conveyor Belt (2m–7m, y=2.8m)</title>
                    <rect x={sx} y={sy} width={w} height={h} fill={isDark ? '#2a4a3a' : '#9ac'} opacity={0.6} rx={mToPxY(0.2)} stroke={isDark ? '#3a6a4a' : '#7a9'} strokeWidth={1.5} />
                    {[0, 1, 2, 3].map((i) => {
                      const ax = sx + w * 0.15 + i * (w * 0.22);
                      const ay = sy + h / 2;
                      return <polygon key={`arrow-${i}`} points={`${ax},${ay - 3} ${ax + 8},${ay} ${ax},${ay + 3}`}
                        fill={isDark ? '#5a8a6a' : '#688'} />;
                    })}
                    <text x={sx + w / 2} y={sy - 6} textAnchor="middle" fontSize={10} fill={labelColor} fontWeight={600}>CONVEYOR</text>
                  </g>
                );
              })()}

              {/* Pickup Table */}
              {(() => {
                const { sx, sy } = toSvg(0.6, 0.5);
                const w = mToPxX(0.8);
                const h = mToPxY(0.5);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Pickup Table — 0.8m × 0.6m, height 0.4m (x=0.6, y=0)</title>
                    <rect x={sx - w / 2} y={sy - h / 2} width={w} height={h} fill={tableColor} opacity={0.75} rx={3} stroke="#6B4914" strokeWidth={1.5} />
                  </g>
                );
              })()}

              {/* Box on table */}
              {(() => {
                const { sx, sy } = toSvg(0.6, 0.5);
                const s = mToPxX(0.15);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Box — 5kg, on pickup table (z=0.52m)</title>
                    <rect x={sx - s / 2} y={sy - s / 2} width={s} height={s} fill="#A67333" opacity={0.9} rx={2} stroke="#805020" strokeWidth={1} />
                  </g>
                );
              })()}

              {/* Target Shelf */}
              {(() => {
                const { sx, sy } = toSvg(0.6, -0.5);
                const w = mToPxX(0.8);
                const h = mToPxY(0.5);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Target Shelf — above table at height 1.1m (same x=0.6, y=0 in 3D)</title>
                    <rect x={sx - w / 2} y={sy - h / 2} width={w} height={h} fill={shelfColor} opacity={0.7} rx={3} stroke="#555566" strokeWidth={1.5} />
                    <line x1={sx - w / 2 + 3} y1={sy} x2={sx + w / 2 - 3} y2={sy} stroke="#555566" strokeWidth={0.8} strokeDasharray="3 2" />
                  </g>
                );
              })()}

              {/* Pallet */}
              {(() => {
                const { sx, sy } = toSvg(-0.8, 0.5);
                const w = mToPxX(1.0);
                const h = mToPxY(0.8);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Pallet — 1.0m × 0.8m, ground level (x=-0.8, y=0)</title>
                    <rect x={sx - w / 2} y={sy - h / 2} width={w} height={h} fill={palletColor} opacity={0.6} rx={2} stroke="#3a5530" strokeWidth={1} />
                    <line x1={sx - w / 2 + 2} y1={sy - h * 0.25} x2={sx + w / 2 - 2} y2={sy - h * 0.25} stroke="#3a5530" strokeWidth={0.8} />
                    <line x1={sx - w / 2 + 2} y1={sy + h * 0.25} x2={sx + w / 2 - 2} y2={sy + h * 0.25} stroke="#3a5530" strokeWidth={0.8} />
                  </g>
                );
              })()}

              {/* Station B */}
              {(() => {
                const { sx, sy } = toSvg(6, 0);
                const r = mToPxX(0.3);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Station B — navigation waypoint (x=6, y=0)</title>
                    <circle cx={sx} cy={sy} r={r} fill="#339933" opacity={0.25} stroke="#339933" strokeWidth={2} />
                    <circle cx={sx} cy={sy} r={4} fill="#339933" />
                  </g>
                );
              })()}

              {/* Cones */}
              {[
                { id: 'cone_1', x: 2, y: 0.5 },
                { id: 'cone_2', x: 3, y: -0.3 },
                { id: 'cone_3', x: 4, y: 0.4 },
              ].map((cone) => {
                const { sx, sy } = toSvg(cone.x, cone.y);
                const s = mToPxX(0.14);
                return (
                  <g key={cone.id} className="floor-obj" style={HOVER_STYLE}>
                    <title>{cone.id.replace('_', ' ')} — obstacle at ({cone.x}m, {cone.y}m)</title>
                    <polygon
                      points={`${sx},${sy - s} ${sx - s * 0.8},${sy + s * 0.6} ${sx + s * 0.8},${sy + s * 0.6}`}
                      fill="#FF8000" opacity={0.85} stroke="#CC6600" strokeWidth={1}
                    />
                  </g>
                );
              })}

              {/* Hazard stripes */}
              {(() => {
                const { sx, sy } = toSvg(-1.5, -0.7);
                const w = mToPxX(1.8);
                return (
                  <g>
                    <line x1={sx} y1={sy} x2={sx + w} y2={sy} stroke="#ccaa00" strokeWidth={3} strokeDasharray="6 4" opacity={0.5} />
                    <line x1={sx} y1={sy + mToPxY(1.4)} x2={sx + w} y2={sy + mToPxY(1.4)} stroke="#ccaa00" strokeWidth={3} strokeDasharray="6 4" opacity={0.5} />
                  </g>
                );
              })()}

              {/* Fire extinguisher */}
              {(() => {
                const { sx, sy } = toSvg(-2.2, 3.1);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Fire Extinguisher</title>
                    <rect x={sx - 4} y={sy - 4} width={8} height={8} fill="#cc0000" rx={2} />
                    <text x={sx} y={sy + 3} textAnchor="middle" fontSize={7} fill="#fff" fontWeight={700}>FE</text>
                  </g>
                );
              })()}

              {/* Emergency exit */}
              {(() => {
                const { sx, sy } = toSvg(-2.2, -3.1);
                return (
                  <g className="floor-obj" style={HOVER_STYLE}>
                    <title>Emergency Exit</title>
                    <rect x={sx - 10} y={sy - 6} width={20} height={12} fill="#009900" rx={2} />
                    <text x={sx} y={sy + 4} textAnchor="middle" fontSize={7} fill="#fff" fontWeight={700}>EXIT</text>
                  </g>
                );
              })()}

            </svg>
          </Box>

          {/* Legend */}
          <Box data-tour="floor-legend" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1.5, px: 1.5, py: 1, border: 1, borderColor: 'divider', borderRadius: 1.5, backgroundColor: isDark ? '#1e293b' : '#f8f9fc' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mr: 0.5, lineHeight: '20px' }}>LEGEND</Typography>
            {[
              { shape: 'rect' as const, color: tableColor, label: 'Table' },
              { shape: 'rect' as const, color: shelfColor, label: 'Shelf' },
              { shape: 'rect' as const, color: palletColor, label: 'Pallet' },
              { shape: 'circle' as const, color: '#339933', label: 'Waypoint' },
              { shape: 'triangle' as const, color: '#FF8000', label: 'Obstacle cone' },
              { shape: 'rect' as const, color: isDark ? '#3a3a4a' : '#aaa', label: 'Storage rack' },
              { shape: 'rect' as const, color: isDark ? '#2a4a3a' : '#9ac', label: 'Conveyor' },
              { shape: 'line' as const, color: wallColor, label: 'Wall' },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                  {item.shape === 'rect' && <rect x={1} y={3} width={12} height={8} fill={item.color} rx={2} />}
                  {item.shape === 'circle' && <circle cx={7} cy={7} r={5} fill={item.color} opacity={0.5} stroke={item.color} strokeWidth={1.5} />}
                  {item.shape === 'triangle' && <polygon points="7,1 2,13 12,13" fill={item.color} />}
                  {item.shape === 'line' && <line x1={1} y1={7} x2={13} y2={7} stroke={item.color} strokeWidth={3} />}
                </svg>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>

          <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: 'text.secondary', mt: 1 }}>
            MuJoCo scene · Hover objects for details · Grid: 1m
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default FactoryFloorPage;
