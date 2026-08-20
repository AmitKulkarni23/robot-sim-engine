import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import TopBar from '@/components/layout/TopBar';
import { createScenario, getScenario, getScenarios } from '@/api/scenarios';
import { useTour } from '@/hooks/useTour';
import { TOUR_IDS, scenarioEditorTourSteps } from '@/tours';
import type { Scenario } from '@/types/scenario';

const BLANK_TEMPLATE = `# Scenario Definition (Robot Sim Engine)
# Docs: each field is explained inline below.

scenario_id: my-new-scenario  # Unique identifier for this scenario
version: 1                    # Schema version — increment on breaking changes
robot_model: unitree_g1       # Robot model from MuJoCo Menagerie (unitree_g1)

task:
  task_type: pick_and_place    # Task type: stand_still | pick_and_place | walk_forward
  description: "Describe the task here."

# Objects placed in the scene before simulation starts (omit for body-only tasks)
object_placements:
  - object_id: box_5kg                     # Object asset ID from the object library
    position: [0.6, 0.0, 0.52]            # [x, y, z] in meters, world frame
    orientation: [1.0, 0.0, 0.0, 0.0]     # Quaternion [w, x, y, z] — identity = no rotation

# Domain randomization settings
randomization:
  seed: null              # Random seed for reproducibility (null = non-deterministic)
  position_noise_std: 0.0 # Gaussian noise std on object positions (meters, must be >= 0)
`;

const ScenarioEditorPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { scenarioId } = useParams<{ scenarioId?: string }>();
  const isDark = theme.palette.mode === 'dark';

  const [yaml, setYaml] = useState(BLANK_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Scenario[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    getScenarios().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (!scenarioId) return;
    setLoadingTemplate(true);
    getScenario(scenarioId)
      .then((detail) => {
        setYaml(detail.yamlContent);
        setSelectedTemplate(scenarioId);
      })
      .catch((err) => setError(`Failed to load scenario: ${err.message}`))
      .finally(() => setLoadingTemplate(false));
  }, [scenarioId]);

  const handleTemplateChange = useCallback(
    async (templateId: string) => {
      setSelectedTemplate(templateId);
      setError(null);
      setSuccess(null);
      if (templateId === 'blank') {
        setYaml(BLANK_TEMPLATE);
        return;
      }
      setLoadingTemplate(true);
      try {
        const detail = await getScenario(templateId);
        setYaml(detail.yamlContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setLoadingTemplate(false);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createScenario(yaml);
      setSuccess(`Scenario "${result.name}" saved (v${result.version})`);
      setTimeout(() => navigate('/scenarios'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
    } finally {
      setSaving(false);
    }
  }, [yaml, navigate]);

  const pageTour = useTour({
    tourId: TOUR_IDS.SCENARIO_EDITOR,
    steps: scenarioEditorTourSteps,
    autoStartDelay: 1000,
  });

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'scenarios', scenarioId ? 'Edit' : 'New']} onStartTour={() => {
        pageTour.reset();
        pageTour.startTour();
      }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 3 }}>
        <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
              {scenarioId ? 'Edit Scenario' : 'New Scenario'}
            </Typography>
            <Box data-tour="template-select" sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Template:</Typography>
              <Select
                size="small"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                sx={{ fontSize: 13, minWidth: 200 }}
              >
                <MenuItem value="blank">Blank</MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box
            data-tour="yaml-editor"
            sx={{
              flex: 1,
              minHeight: 300,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {loadingTemplate ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Editor
                language="yaml"
                theme={isDark ? 'vs-dark' : 'light'}
                value={yaml}
                onChange={(value) => setYaml(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" size="small" onClick={() => navigate('/scenarios')}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={saving || !yaml.trim()}
              data-tour="save-scenario-btn"
            >
              {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              {saving ? 'Saving...' : 'Save Scenario'}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default ScenarioEditorPage;
