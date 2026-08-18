import React, { useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import RunsPage from '@/pages/RunsPage';
import ScenarioBrowserPage from '@/pages/ScenarioBrowserPage';
import ComparePage from '@/pages/ComparePage';
import ScenarioEditorPage from '@/pages/ScenarioEditorPage';
import FactoryFloorPage from '@/pages/FactoryFloorPage';
import { buildTheme } from '@/config/theme';
import { ColorModeContext, type ColorMode } from '@/hooks/useColorMode';

const App: React.FC = () => {
  const [mode, setMode] = useState<ColorMode>('light');

  const colorModeValue = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [mode]
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/runs" replace />} />
              <Route path="/runs" element={<RunsPage />} />
              <Route path="/runs/:runId" element={<RunsPage />} />
              <Route path="/scenarios" element={<ScenarioBrowserPage />} />
              <Route path="/scenarios/new" element={<ScenarioEditorPage />} />
              <Route path="/scenarios/:scenarioId/edit" element={<ScenarioEditorPage />} />
              <Route path="/floor" element={<FactoryFloorPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="*" element={<Navigate to="/runs" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;
