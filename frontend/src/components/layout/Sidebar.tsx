import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CategoryIcon from '@mui/icons-material/Category';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import GridOnIcon from '@mui/icons-material/GridOn';
import DifferenceIcon from '@mui/icons-material/Difference';
import { fontFamilyMono } from '@/config/theme';

const NAV_ITEMS = [
  { to: '/runs', label: 'Runs', icon: ListAltIcon },
  { to: '/scenarios', label: 'Scenarios', icon: CategoryIcon },
  { to: '/floor', label: 'Factory Floor', icon: GridOnIcon },
  { to: '/compare', label: 'Compare', icon: CompareArrowsIcon },
  { to: '/code-diff', label: 'Code Diff', icon: DifferenceIcon },
];

const Sidebar: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="aside"
      sx={{
        width: 240,
        minWidth: 240,
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: 15 }}>
          <PsychologyIcon sx={{ color: theme.palette.primary.main }} fontSize="small" />
          Robot Sim Engine
        </Box>
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: theme.palette.text.disabled, mt: 0.5 }}>
          v0.1.0-alpha
        </Typography>
      </Box>

      <Box component="nav" sx={{ p: 1, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.palette.text.disabled,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            px: 1,
            pt: 1.5,
            pb: 0.5,
          }}
        >
          Simulation
        </Typography>
        {NAV_ITEMS.map((item) => (
          <Box
            key={item.to}
            component={NavLink}
            to={item.to}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 0.75,
              borderRadius: 1.5,
              fontSize: 13,
              color: theme.palette.text.secondary,
              textDecoration: 'none',
              '&:hover': { backgroundColor: theme.palette.action.hover, color: theme.palette.text.primary },
              '&.active': {
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.primary,
                fontWeight: 500,
              },
            }}
          >
            <item.icon sx={{ fontSize: 16 }} />
            {item.label}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          fontSize: 12,
          color: theme.palette.text.disabled,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.palette.success.main }} />
        Lambda connected
      </Box>
    </Box>
  );
};

export default Sidebar;
