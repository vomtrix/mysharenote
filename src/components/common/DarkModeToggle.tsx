import React, { useContext } from 'react';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { ColorModeContext } from '@styles/ColorModeContext';
import { DARK_MODE_ENABLED, DARK_MODE_FORCE } from 'src/config/config';

const DarkModeToggle = () => {
  const { mode, toggle } = useContext(ColorModeContext);
  if (!DARK_MODE_ENABLED || DARK_MODE_FORCE) return null;
  const nextLabel = mode === 'light' ? 'Dark mode' : 'Light mode';
  return (
    <Tooltip title={nextLabel}>
      <IconButton onClick={toggle} aria-label="toggle-dark-mode">
        {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default DarkModeToggle;
