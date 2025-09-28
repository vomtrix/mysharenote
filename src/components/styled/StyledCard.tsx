import { Card } from '@mui/material';
import { styled } from '@mui/system';

export const StyledCard = styled(Card)(() => ({
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  border: 'unset',
  marginBottom: 20,
  width: '100%'
}));
