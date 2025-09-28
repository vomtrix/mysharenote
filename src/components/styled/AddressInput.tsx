import InputBase from '@mui/material/InputBase';
import { alpha, styled } from '@mui/material/styles';
import { PRIMARY_WHITE } from '@styles/colors';

export const AddressInput = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(PRIMARY_WHITE, 0.15),
  '&:hover': {
    backgroundColor: alpha(PRIMARY_WHITE, 0.25)
  },
  marginLeft: 0,
  color: PRIMARY_WHITE,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto'
  }
}));

export const AddressIconWrapper = styled('div')(({ theme }) => ({
  padding: '5px 0px 5px 10px',
  height: '100%',
  position: 'absolute',
  color: PRIMARY_WHITE,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

export const StyledAddressInputBase = styled(InputBase)(({ theme }) => ({
  color: PRIMARY_WHITE,
  width: '100%',
  '& .MuiInputBase-input': {
    lineHeight: 'initial',
    padding: '10px 10px 10px 0',
    paddingLeft: `calc(1em + ${theme.spacing(3)})`,
    transition: theme.transitions.create('width'),
    [theme.breakpoints.up('sm')]: {
      width: '42ch',
      '&:focus': {
        width: '43ch'
      }
    }
  }
}));
