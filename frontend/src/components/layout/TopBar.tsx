import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/hooks/useColorMode';

type TopBarProps = {
  breadcrumb: string[];
  onStartTour?: () => void;
};

const TopBar: React.FC<TopBarProps> = ({ breadcrumb, onStartTour }) => {
  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();

  return (
    <Box
      component="header"
      sx={{
        px: 3,
        py: 1.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: theme.palette.background.paper,
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13, color: theme.palette.text.secondary }}>
        {breadcrumb.map((crumb, index) => (
          <React.Fragment key={crumb}>
            {index > 0 && <Typography component="span" sx={{ color: theme.palette.text.disabled }}>/</Typography>}
            <Typography
              component="span"
              sx={index === breadcrumb.length - 1 ? { color: theme.palette.text.primary, fontWeight: 600 } : undefined}
            >
              {crumb}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {onStartTour && (
          <Tooltip title="Take a tour of this page">
            <IconButton
              size="small"
              aria-label="Start tour"
              onClick={onStartTour}
              data-tour="tour-button"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton
          size="small"
          aria-label="Toggle color mode"
          onClick={toggleMode}
          data-tour="theme-toggle"
        >
          {mode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default TopBar;
