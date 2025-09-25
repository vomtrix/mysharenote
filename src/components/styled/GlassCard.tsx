import { alpha, styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import { PRIMARY_WHITE, PRIMARY_BLACK } from '@styles/colors';

const GlassCard = styled(Paper)(({ theme }) => ({
  background: alpha(PRIMARY_BLACK, 0.15),
  border: `1px solid ${alpha(PRIMARY_WHITE, 0.2)}`,
  boxShadow: `0 8px 32px 0 ${alpha(PRIMARY_BLACK, 0.2)}`,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 16,
  overflow: 'hidden'
}));

export default GlassCard;
