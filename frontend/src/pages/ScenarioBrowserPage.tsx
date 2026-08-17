import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import ScenarioRow from '@/components/scenarios/ScenarioRow';
import FilterTabs from '@/components/common/FilterTabs';
import { useScenarios } from '@/hooks/useScenarios';
import type { ScenarioStatus } from '@/types/scenario';

type ScenarioFilter = 'all' | ScenarioStatus;

const FILTER_OPTIONS: { value: ScenarioFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const ScenarioBrowserPage: React.FC = () => {
  const { data: scenarios, loading, error } = useScenarios();
  const [filter, setFilter] = useState<ScenarioFilter>('all');
  const navigate = useNavigate();

  const filteredScenarios = useMemo(
    () => (filter === 'all' ? scenarios : scenarios.filter((scenario) => scenario.status === filter)),
    [scenarios, filter]
  );

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'scenarios']} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Scenarios</Typography>
              <FilterTabs options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate('/scenarios/new')}
                sx={{ ml: 'auto', fontSize: 12 }}
              >
                New Scenario
              </Button>
            </Box>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, backgroundColor: 'background.paper' }}>
              {filteredScenarios.map((scenario) => (
                <ScenarioRow key={scenario.id} scenario={scenario} />
              ))}
              {filteredScenarios.length === 0 && (
                <Box sx={{ p: 3 }}>
                  <Typography color="text.secondary">No scenarios match this filter.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
};

export default ScenarioBrowserPage;
