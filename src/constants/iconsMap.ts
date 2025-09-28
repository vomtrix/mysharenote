import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';

const icons: any = {
  ArrowCircleLeftIcon,
  AccountBalanceWalletIcon,
  ArrowBackIcon,
  ArrowForwardIcon,
  RotateLeftIcon
};

export const getIcon = (iconName: string) => {
  return icons[iconName];
};
