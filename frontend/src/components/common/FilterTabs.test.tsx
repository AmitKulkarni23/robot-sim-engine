import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/config/theme';
import FilterTabs from './FilterTabs';

const options = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

const renderFilterTabs = (value = 'all') => {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={buildTheme('light')}>
      <FilterTabs options={options} value={value} onChange={onChange} />
    </ThemeProvider>
  );
  return { onChange };
};

describe('FilterTabs', () => {
  describe('when rendered', () => {
    it('should mark the active option as pressed', () => {
      renderFilterTabs('pass');
      expect(screen.getByRole('button', { name: 'Pass' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('when a tab is clicked', () => {
    it('should call onChange with the clicked option value when Fail is clicked', async () => {
      const user = userEvent.setup();
      const { onChange } = renderFilterTabs('all');
      await user.click(screen.getByRole('button', { name: 'Fail' }));
      expect(onChange).toHaveBeenCalledWith('fail');
    });
  });
});
