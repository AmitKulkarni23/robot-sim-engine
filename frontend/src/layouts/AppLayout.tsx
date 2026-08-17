import React from 'react';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';

const AppLayout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
