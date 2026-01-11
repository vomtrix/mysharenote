import { Select } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import { PRIMARY_WHITE } from '@styles/colors';

export const StyledSelect = styled(Select)(() => ({
  borderRadius: '6px',
  fontSize: '0.8rem',
  lineHeight: 'none',
  background: alpha(PRIMARY_WHITE, 0.15),
  padding: '1px 5px',
  color: PRIMARY_WHITE,
  borderColor: 'unset',
  fontWeight: 600,
  '& .MuiSelect-select': {
    padding: '3px 5px !important'
  },
  '& .MuiSelect-icon': {
    display: 'none'
  }
}));
