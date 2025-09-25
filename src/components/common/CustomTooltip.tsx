import { ReactElement } from 'react';
import { Tooltip, Zoom } from '@mui/material';
import { PRIMARY_GREY } from '@styles/colors';

interface CustomTooltipProps {
  children: ReactElement;
  title?: string; // Make title optional
  placement?:
    | 'right'
    | 'bottom-end'
    | 'bottom-start'
    | 'bottom'
    | 'left-end'
    | 'left-start'
    | 'left'
    | 'right-end'
    | 'right-start'
    | 'top-end'
    | 'top-start'
    | 'top'
    | undefined;
  textColor?: string;
  backgroundColor?: string;
  disableFocusListener?: boolean;
  disableTouchListener?: boolean;
  open?: boolean;
  textBold?: boolean;
}

const CustomTooltip = (props: CustomTooltipProps) => {
  const {
    children,
    title,
    placement,
    textColor,
    textBold,
    backgroundColor,
    disableFocusListener,
    disableTouchListener,
    open
  } = props;

  return title ? (
    <Tooltip
      title={title || ''}
      placement={placement || 'right'}
      TransitionComponent={Zoom}
      arrow
      PopperProps={{
        sx: {
          '& .MuiTooltip-arrow': {
            color: backgroundColor || PRIMARY_GREY
          },
          '& .MuiTooltip-tooltip': {
            color: textColor || 'inherit',
            backgroundColor: backgroundColor || PRIMARY_GREY,
            fontWeight: textBold ? 'bold' : 'normal'
          }
        }
      }}
      disableFocusListener={disableFocusListener}
      disableTouchListener={disableTouchListener}
      open={open}>
      <div>{children}</div>
    </Tooltip>
  ) : (
    <>{children}</>
  );
};

export default CustomTooltip;
