import { useRouter } from 'next/router';
import { nip19 } from 'nostr-tools';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';
import CustomInput from '@components/common/CustomInput';
import { useNotification } from '@hooks/UseNotificationHook';
import { NetworkTypeType } from '@objects/Enums';
import { clearAddress, clearSettings } from '@store/app/AppReducer';
import { getSettings } from '@store/app/AppSelectors';
import { changeRelay } from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import {
  EXPLORER_URL,
  HOME_PAGE_ENABLED,
  PAYER_PUBLIC_KEY,
  RELAY_URL,
  WORK_PROVIDER_PUBLIC_KEY
} from 'src/config/config';

const SettingsModal = () => {
  const { t } = useTranslation();
  const settings = useSelector(getSettings);
  const dispatch = useDispatch();
  const { showError } = useNotification();
  const router = useRouter();

  const networkOptions = [
    { label: t('settings.mainnet'), value: NetworkTypeType.Mainnet },
    { label: t('settings.testnet'), value: NetworkTypeType.Testnet },
    { label: t('settings.regtest'), value: NetworkTypeType.Regtest }
  ];

  const validationSchema = Yup.object().shape({
    relay: Yup.string()
      .required(t('settings.relayUrlRequired'))
      .matches(
        /^(ws|wss):\/\/(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost)(:[0-9]{1,5})?$/,
        t('settings.invalidRelayFormat')
      ),
    explorer: Yup.string()
      .required(t('settings.explorerUrlRequired'))
      .matches(
        /^(https?):\/\/((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost|\d{1,3}(\.\d{1,3}){3}))(:\d{1,5})?$/,
        t('settings.invalidUrlFormat')
      ),
    payerPublicKey: Yup.string()
      .required(t('settings.authorPubKeyRequired'))
      .test('is-valid-payer-pubkey', t('settings.invalidPublicKeyFormat'), (value: any) => {
        return !!nip19.NostrTypeGuard.isNPub(value);
      }),
    workProviderPublicKey: Yup.string()
      .required(t('settings.authorPubKeyRequired'))
      .test('is-valid-work-provider-pubkey', t('settings.invalidPublicKeyFormat'), (value: any) => {
        return !!nip19.NostrTypeGuard.isNPub(value);
      }),
    network: Yup.string()
      .oneOf(
        networkOptions.map((option) => option.value),
        t('settings.invalidNetworkType')
      )
      .required(t('settings.networkTypeRequired'))
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      relay: settings.relay || '',
      payerPublicKey: settings.payerPublicKey ? nip19.npubEncode(settings.payerPublicKey) : '',
      workProviderPublicKey: settings.workProviderPublicKey
        ? nip19.npubEncode(settings.workProviderPublicKey)
        : '',
      explorer: settings.explorer || '',
      network: settings.network || ''
    }
  });

  const onSubmit = async (data: any) => {
    try {
      data = {
        ...data,
        payerPublicKey: nip19.decode(data.payerPublicKey).data,
        workProviderPublicKey: nip19.decode(data.workProviderPublicKey).data
      };
      await dispatch(changeRelay(data));
    } catch (err: any) {
      console.error(err);
      showError({
        message: t('settings.configError'),
        options: {
          position: 'bottom-center',
          toastId: 'invalid-address'
        }
      });
    }
  };

  const onReset = async () => {
    reset({
      relay: RELAY_URL || '',
      network: NetworkTypeType.Mainnet,
      payerPublicKey: PAYER_PUBLIC_KEY ? nip19.npubEncode(PAYER_PUBLIC_KEY) : '',
      workProviderPublicKey: WORK_PROVIDER_PUBLIC_KEY
        ? nip19.npubEncode(WORK_PROVIDER_PUBLIC_KEY)
        : '',
      explorer: EXPLORER_URL || ''
    });
    dispatch(clearSettings());
    dispatch(clearAddress());
  };

  return (
    <Box
      sx={{
        my: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          {HOME_PAGE_ENABLED && (
            <Button
              variant="text"
              color="primary"
              size="small"
              startIcon={<ArrowBackIosNewIcon />}
              onClick={() => router.push('/')}
              sx={{ textTransform: 'none', fontWeight: 600 }}>
              {t('settings.goHome')}
            </Button>
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 'bold !important',
              textAlign: 'center',
              typography: { xs: 'h6', md: 'h5' }
            }}>
            {t('settings.title')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
      </Box>

      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <Box sx={{ py: 1 }}>
          <FormLabel component="legend" sx={{ paddingBottom: 1 }}>
            {t('settings.relay')}
          </FormLabel>
          <CustomInput
            type="text"
            placeholder={t('settings.relayUrl')}
            register={register('relay')}
            error={errors.relay}
            required
          />
        </Box>
        <Box sx={{ py: 1 }}>
          <FormLabel component="legend" sx={{ paddingBottom: 1 }}>
            {t('settings.payerPublicKey')}
          </FormLabel>
          <CustomInput
            type="text"
            placeholder={t('settings.enterNpub')}
            register={register('payerPublicKey')}
            error={errors.payerPublicKey}
            required
          />
        </Box>

        <Box sx={{ py: 1 }}>
          <FormLabel component="legend" sx={{ paddingBottom: 1 }}>
            {t('settings.workProviderPublicKey')}
          </FormLabel>
          <CustomInput
            type="text"
            placeholder={t('settings.enterNpub')}
            register={register('workProviderPublicKey')}
            error={errors.workProviderPublicKey}
            required
          />
        </Box>

        <Box sx={{ py: 1 }}>
          <FormLabel component="legend" sx={{ paddingBottom: 1 }}>
            {t('settings.explorer')}
          </FormLabel>
          <CustomInput
            type="text"
            placeholder={t('settings.explorerUrl')}
            register={register('explorer')}
            error={errors.relay}
            required
          />
        </Box>

        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">{t('settings.network')}</FormLabel>
          <Controller
            name="network"
            control={control}
            defaultValue={settings.network || ''}
            render={({ field }) => (
              <RadioGroup row {...field}>
                {networkOptions.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                  />
                ))}
              </RadioGroup>
            )}
          />
        </FormControl>

        <Box mt={2} sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onReset} variant="outlined" color="secondary" size="small">
            {t('settings.reset')}
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {t('settings.save')}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default SettingsModal;
