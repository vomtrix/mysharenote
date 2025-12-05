import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import IconButton from '@mui/material/IconButton';
import { Box } from '@mui/system';
import {
  AddressIconWrapper,
  AddressInput,
  StyledAddressInputBase
} from '@components/styled/AddressInput';
import { useNotification } from '@hooks/UseNotificationHook';
import { addAddress, clearAddress, setSkeleton } from '@store/app/AppReducer';
import { getAddress, getSettings } from '@store/app/AppSelectors';
import { useDispatch, useSelector } from '@store/store';
import { isMobileDevice, truncateAddress, validateAddress } from '@utils/helpers';
import {
  ConnectedAddressButton,
  ConnectedAddressIconWrapper,
  StyledAddressButton
} from './styled/ConnectedAddressButton';

interface ConnectFormData {
  address: string;
}

interface ConnectProps {
  hasButton?: boolean;
}

const Connect = ({ hasButton = false }: ConnectProps) => {
  const { t } = useTranslation();
  const { showError } = useNotification();
  const dispatch = useDispatch();
  const router = useRouter();
  const address = useSelector(getAddress);
  const isMobile = isMobileDevice();
  const settings = useSelector(getSettings);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [displayAddress, setDisplayAddress] = useState<string>(address || '');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);

  const validationSchema = Yup.object().shape({
    address: Yup.string()
      .required(t('addressRequired'))
      .matches(/^[a-zA-Z0-9]{30,}$/, t('invalidAddressFormat'))
      .test('is-valid-address', t('invalidAddress'), (value: any) => {
        return validateAddress(value, settings.network);
      })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus
  } = useForm<ConnectFormData>({
    resolver: yupResolver(validationSchema)
  });

  const onSubmit = (data: ConnectFormData) => {
    dispatch(clearAddress());
    router.replace(`/address/${data.address}`);
    dispatch(addAddress(data.address));
  };

  const onChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleDisplayInput = () => {
    setInputValue('');
    setInputVisible(true);
    dispatch(setSkeleton(true));
    setTimeout(() => {
      setFocus('address');
    }, 500);
  };

  useEffect(() => {
    if (address) {
      setInputVisible(false);
    } else {
      setInputVisible(true);
    }
  }, [address]);

  useEffect(() => {
    if (errors.address?.message) {
      if (isMobile) {
        const inputElement = document.querySelector('input[name="address"]') as HTMLInputElement;
        inputElement?.blur();
      }

      showError({
        message: errors.address?.message,
        options: {
          position: 'bottom-center',
          toastId: errors.address.type
        }
      });
    }
  }, [errors]);

  useEffect(() => {
    const computeDisplayAddress = () => {
      if (!address || !buttonRef.current || !measureRef.current) return;

      const button = buttonRef.current;
      const measure = measureRef.current;
      const computedStyle = getComputedStyle(button);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const availableWidth = button.clientWidth - paddingLeft - paddingRight;

      if (availableWidth <= 0) return;

      measure.style.font = computedStyle.font;
      measure.style.letterSpacing = computedStyle.letterSpacing;
      const measureText = (text: string) => {
        measure.textContent = text;
        return measure.offsetWidth;
      };

      if (measureText(address) <= availableWidth) {
        setDisplayAddress(address);
        return;
      }

      const minVisibleChars = 2; // at least one on each side
      let low = minVisibleChars;
      let high = address.length;
      let best = truncateAddress(address, 1, 1);

      const build = (visibleChars: number) => {
        const leading = Math.ceil(visibleChars / 2);
        const trailing = visibleChars - leading;
        return truncateAddress(address, leading, trailing);
      };

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = build(mid);
        const width = measureText(candidate);

        if (width <= availableWidth) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setDisplayAddress(best);
    };

    const button = buttonRef.current;
    if (!button) return;

    const resizeObserver = new ResizeObserver(computeDisplayAddress);
    resizeObserver.observe(button);
    computeDisplayAddress();

    return () => {
      resizeObserver.disconnect();
    };
  }, [address]);

  return (
    <>
      {inputVisible && (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', width: '100%', minWidth: 0 }}>
          <AddressInput style={hasButton ? { paddingRight: 20 } : undefined}>
            <AddressIconWrapper>
              <AccountBalanceWalletIcon />
            </AddressIconWrapper>
            <StyledAddressInputBase
              value={inputValue}
              placeholder={t('address')}
              {...register('address', {
                onChange: onChangeAddress,
                onBlur: () => {
                  if (address) {
                    setInputVisible(false);
                    dispatch(setSkeleton(false));
                  }
                }
              })}
              inputProps={{ 'aria-label': 'search', autoComplete: 'off' }}
            />
            {hasButton && (
              <Box
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                <IconButton type="submit" color="inherit" size="small">
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </AddressInput>
        </Box>
      )}
      {!inputVisible && address && (
        <Box display="flex" alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
          <ConnectedAddressButton>
            <ConnectedAddressIconWrapper>
              <AccountBalanceWalletIcon />
            </ConnectedAddressIconWrapper>
            <StyledAddressButton ref={buttonRef} onClick={handleDisplayInput} title={address}>
              {displayAddress}
            </StyledAddressButton>
            <span
              ref={measureRef}
              aria-hidden
              style={{
                position: 'absolute',
                visibility: 'hidden',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                padding: 0,
                margin: 0,
                fontSize: 'inherit',
                letterSpacing: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit'
              }}
            />
          </ConnectedAddressButton>
        </Box>
      )}
    </>
  );
};

export default Connect;
