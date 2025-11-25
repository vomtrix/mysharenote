import { alpha, styled } from '@mui/material/styles';
import { PRIMARY_WHITE } from '@styles/colors';

export const ConnectedAddressButton = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(PRIMARY_WHITE, 0.15),
  '&:hover': {
    backgroundColor: alpha(PRIMARY_WHITE, 0.25)
  },
  marginLeft: 0,
  color: PRIMARY_WHITE,
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
  [theme.breakpoints.up('sm')]: {
    // marginLeft: theme.spacing(1)
  }
}));

export const ConnectedAddressIconWrapper = styled('div')(() => ({
  padding: '5px 0px 5px 10px',
  height: '100%',
  position: 'absolute',
  color: PRIMARY_WHITE,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

export const StyledAddressButton = styled('button')(({ theme }) => ({
  color: PRIMARY_WHITE,
  backgroundColor: 'transparent',
  letterSpacing: '0.05em',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
  fontSize: '0.9rem',
  padding: '10px 10px 10px 0',
  paddingLeft: `calc(1em + ${theme.spacing(3)})`,
  textAlign: 'left',
  transition: theme.transitions.create('width'),
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  '&:focus': {
    outline: 'none'
  }
}));
