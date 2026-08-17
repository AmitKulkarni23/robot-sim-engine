import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useTheme } from '@mui/material/styles';
import { fontFamilyMono } from '@/config/theme';

type VideoPlaceholderProps = {
  caption: string;
};

const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({ caption }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        backgroundColor: theme.palette.action.hover,
        aspectRatio: '16 / 9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: theme.palette.text.disabled }}>
        <PlayCircleOutlineIcon sx={{ fontSize: 40 }} />
        <Typography variant="body2">{caption}</Typography>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        }}
      >
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
          00:00 / 00:00
        </Typography>
        <Box sx={{ flex: 1, height: 3, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />
      </Box>
    </Box>
  );
};

export default VideoPlaceholder;
