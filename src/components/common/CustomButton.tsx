import { ReactElement } from 'react';
import { getIcon } from '@constants/iconsMap';
import { Button } from '@mui/material';
import { PRIMARY_BLACK, PRIMARY_GREY, PRIMARY_WHITE } from '@styles/colors';
import { useTheme } from '@mui/material/styles';
import { setWidthStyle } from '@utils/helpers';

interface CustomButtonProps {
  label?: string;
  onClick?: (params?: any) => void;
  disabled?: boolean;
  outlined?: boolean;
  endIcon?: boolean;
  textBold?: boolean;
  iconName?: string;
  children?: ReactElement;
  type?: 'button' | 'submit';
  width?: number;
  size?: 'small' | 'medium' | 'large' | undefined;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textHoverColor?: string;
  hoverBackgroundColor?: string;
}

const CustomButton = (props: CustomButtonProps) => {
  const {
    onClick,
    children,
    label,
    disabled = false,
    outlined,
    iconName,
    size,
    width,
    type,
    endIcon,
    textBold,
    textColor,
    backgroundColor,
    textHoverColor,
    hoverBackgroundColor,
    borderColor
  } = props;

  const IconComponent = iconName ? getIcon(iconName) : undefined;

  const theme = useTheme();
  const primary = theme.palette.primary.main;
  return (
    <Button
      onClick={(event: any) => {
        if (onClick && event.clientX && event.clientY) return onClick(event);
      }}
      disabled={disabled}
      variant={outlined ? 'outlined' : 'contained'}
      type={type || 'button'}
      size={size}
      sx={{
        borderRadius: '5px',
        color: outlined ? textColor || PRIMARY_BLACK : textColor || PRIMARY_WHITE,
        backgroundColor: outlined ? 'transparent' : backgroundColor || PRIMARY_BLACK,
        border: `1px solid${borderColor || PRIMARY_BLACK}`,
        fontWeight: textBold ? 'bolder' : 'unset',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.2s ease-out 0s',
        '&:disabled': {
          color: PRIMARY_GREY
        },
        '&:hover': {
          backgroundColor: hoverBackgroundColor || primary,
          border: `1px solid ${primary}`,
          color: textHoverColor || PRIMARY_WHITE
        },
        lineHeight: 'unset',
        textTransform: 'unset',
        ...setWidthStyle(width),
        paddingX: { xs: '5px', md: '8px' }
      }}>
      {IconComponent && !endIcon && (
        <IconComponent
          sx={{ color: outlined ? textColor || PRIMARY_BLACK : textColor || PRIMARY_WHITE }}
        />
      )}
      {label}
      {IconComponent && endIcon && (
        <IconComponent
          sx={{ color: outlined ? textColor || PRIMARY_BLACK : textColor || PRIMARY_WHITE }}
        />
      )}
      {children}
    </Button>
  );
};

export default CustomButton;
