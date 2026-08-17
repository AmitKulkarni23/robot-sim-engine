import React from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme } from '@mui/material/styles';

export type FilterTabOption<T extends string> = {
  value: T;
  label: string;
};

type FilterTabsProps<T extends string> = {
  options: FilterTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

function FilterTabs<T extends string>({ options, value, onChange }: FilterTabsProps<T>) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.25,
        backgroundColor: theme.palette.action.hover,
        borderRadius: 1.5,
        p: 0.25,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ButtonBase
            key={option.value}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: 12,
              color: active ? theme.palette.text.primary : theme.palette.text.secondary,
              fontWeight: active ? 500 : 400,
              backgroundColor: active ? theme.palette.background.paper : 'transparent',
              boxShadow: active ? theme.shadows[1] : 'none',
            }}
          >
            {option.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export default FilterTabs;
