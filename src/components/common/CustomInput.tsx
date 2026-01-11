import { ReactNode } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { FormControl, InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { PRIMARY_RED, SECONDARY_GREY_1 } from '@styles/colors';
import CustomTooltip from './CustomTooltip';

interface CustomInputProps {
  id?: string;
  multiline?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: TextFieldProps['variant'];
  type?: string;
  register: UseFormRegisterReturn;
  error?: any;
  startAdornment?: ReactNode;
  inputProps?: TextFieldProps['InputProps'];
}

const CustomInput = (props: CustomInputProps) => {
  const {
    id,
    multiline = false,
    label,
    type,
    register,
    error,
    placeholder,
    required,
    disabled,
    variant,
    startAdornment,
    inputProps
  } = props;

  const computedInputProps: TextFieldProps['InputProps'] = {
    ...inputProps
  };

  if (startAdornment) {
    computedInputProps.startAdornment = (
      <InputAdornment position="start" sx={{ color: 'text.secondary' }}>
        {startAdornment}
      </InputAdornment>
    );
  }

  return (
    <CustomTooltip
      title={error ? error.message : ''}
      placement="bottom-start"
      textColor={PRIMARY_RED}
      backgroundColor={SECONDARY_GREY_1}
      open={!!error}>
      <div style={{ width: '100%' }}>
        <FormControl fullWidth error={!!error}>
          <TextField
            disabled={disabled}
            variant={variant ? variant : 'outlined'}
            label={required && label ? `${label} *` : label}
            placeholder={placeholder}
            type={type}
            id={id}
            multiline={multiline}
            fullWidth
            {...register}
            error={!!error}
            InputLabelProps={{ shrink: true }}
            InputProps={computedInputProps}
            size="small"
            maxRows={Infinity}
          />
        </FormControl>
      </div>
    </CustomTooltip>
  );
};

export default CustomInput;
