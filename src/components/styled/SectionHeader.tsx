import { Box } from '@mui/material';
import { styled } from '@mui/system';

export const SectionHeader = styled(Box)(({ theme }) => ({
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  padding: '10px 5px',
  fontWeight: 'bold',
  fontSize: '1.3rem',
  marginBottom: '1rem',
  color: theme.palette.primary.main
}));
