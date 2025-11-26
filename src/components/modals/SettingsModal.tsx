import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { getChainIconPath, getChainName } from '@constants/chainIcons';
import { yupResolver } from '@hookform/resolvers/yup';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import GavelIcon from '@mui/icons-material/Gavel';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import SettingsInputAntennaOutlinedIcon from '@mui/icons-material/SettingsInputAntennaOutlined';
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
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
  isValidPublicKeyInput,
  normalizePublicKeyInput,
  publicKeyInputToDisplayValue
} from '@utils/nostr';
import {
  CHAIN_METADATA,
  ChainKey,
  DEFAULT_CHAIN_EXPLORERS,
  DEFAULT_NETWORK,
  HOME_PAGE_ENABLED,
  PAYER_PUBLIC_KEY,
  RELAY_URL,
  WORK_PROVIDER_PUBLIC_KEY
} from 'src/config/config';

type SettingsFormValues = {
  relay: string;
  payerPublicKey: any;
  workProviderPublicKey: any;
  explorers: Record<ChainKey, string>;
  network: NetworkTypeType;
};

const SettingsModal = () => {
  const { t } = useTranslation();
  const settings = useSelector(getSettings);
  const dispatch = useDispatch();
  const { showError } = useNotification();
  const router = useRouter();

  const chainEntries = useMemo(
    () => Object.entries(CHAIN_METADATA) as Array<[ChainKey, (typeof CHAIN_METADATA)[ChainKey]]>,
    []
  );

  const explorerDefaults = useMemo(
    () =>
      chainEntries.reduce<Record<ChainKey, string>>(
        (acc, [key, meta]) => {
          acc[key] = settings.explorers?.[key] || meta.explorerUrl || DEFAULT_CHAIN_EXPLORERS[key];
          return acc;
        },
        {} as Record<ChainKey, string>
      ),
    [chainEntries, settings.explorers]
  );

  const networkOptions = [
    { label: t('settings.mainnet'), value: NetworkTypeType.Mainnet },
    { label: t('settings.testnet'), value: NetworkTypeType.Testnet },
    { label: t('settings.regtest'), value: NetworkTypeType.Regtest }
  ];

  const urlValidation =
    /^(https?):\/\/((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost|\d{1,3}(\.\d{1,3}){3}))(:\d{1,5})?(\/.*)?$/;
  const explorersSchema = chainEntries.reduce<Record<ChainKey, Yup.StringSchema<string>>>(
    (shape, [key]) => {
      shape[key] = Yup.string()
        .required(t('settings.explorerUrlRequired'))
        .matches(urlValidation, t('settings.invalidUrlFormat'));
      return shape;
    },
    {} as Record<ChainKey, Yup.StringSchema<string>>
  );

  const validationSchema = Yup.object().shape({
    relay: Yup.string()
      .required(t('settings.relayUrlRequired'))
      .matches(
        /^(ws|wss):\/\/(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost)(:[0-9]{1,5})?$/,
        t('settings.invalidRelayFormat')
      ),
    explorers: Yup.object().shape(explorersSchema),
    payerPublicKey: Yup.string()
      .required(t('settings.authorPubKeyRequired'))
      .test('is-valid-payer-pubkey', t('settings.invalidPublicKeyFormat'), (value: any) =>
        isValidPublicKeyInput(value)
      ),
    workProviderPublicKey: Yup.string()
      .required(t('settings.authorPubKeyRequired'))
      .test('is-valid-work-provider-pubkey', t('settings.invalidPublicKeyFormat'), (value: any) =>
        isValidPublicKeyInput(value)
      ),
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
  } = useForm<SettingsFormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      relay: settings.relay || '',
      payerPublicKey: publicKeyInputToDisplayValue(settings.payerPublicKey),
      workProviderPublicKey: publicKeyInputToDisplayValue(settings.workProviderPublicKey),
      explorers: explorerDefaults,
      network: settings.network || DEFAULT_NETWORK
    }
  });

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const explorers = { ...DEFAULT_CHAIN_EXPLORERS, ...(data.explorers ?? {}) };
      const payload = {
        ...data,
        explorer: explorers.flokicoin,
        explorers,
        payerPublicKey: normalizePublicKeyInput(data.payerPublicKey),
        workProviderPublicKey: normalizePublicKeyInput(data.workProviderPublicKey)
      };
      await dispatch(changeRelay(payload));
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
      network: DEFAULT_NETWORK,
      payerPublicKey: publicKeyInputToDisplayValue(PAYER_PUBLIC_KEY),
      workProviderPublicKey: publicKeyInputToDisplayValue(WORK_PROVIDER_PUBLIC_KEY),
      explorers: { ...DEFAULT_CHAIN_EXPLORERS }
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
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
        width: '100%',
        px: { xs: 1, md: 2 }
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

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          maxHeight: { xs: '70vh', md: '72vh' },
          pr: { xs: 0.5, md: 1 }
        }}>
        <Stack spacing={2.5} sx={{ pb: 1 }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
            }}>
            <Stack spacing={1.5}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t('settings.relay')}
                  </Typography>
                </Box>
                <LanOutlinedIcon color="primary" fontSize="small" />
              </Box>
              <CustomInput
                type="text"
                placeholder={t('settings.relayUrl')}
                register={register('relay')}
                error={errors.relay}
                required
                startAdornment={<SettingsInputAntennaOutlinedIcon fontSize="small" />}
              />
              <Divider flexItem />
              <Stack spacing={1.5} sx={{ width: '100%' }}>
                <Box>
                  <FormLabel
                    component="legend"
                    sx={{ paddingBottom: 0.5, color: 'text.secondary' }}>
                    {t('settings.payerPublicKey')}
                  </FormLabel>
                  <CustomInput
                    type="text"
                    placeholder={t('settings.enterNpub')}
                    register={register('payerPublicKey')}
                    error={errors.payerPublicKey}
                    required
                    startAdornment={<PaymentsIcon fontSize="small" />}
                  />
                </Box>
                <Box>
                  <FormLabel
                    component="legend"
                    sx={{ paddingBottom: 0.5, color: 'text.secondary' }}>
                    {t('settings.workProviderPublicKey')}
                  </FormLabel>
                  <CustomInput
                    type="text"
                    placeholder={t('settings.enterNpub')}
                    register={register('workProviderPublicKey')}
                    error={errors.workProviderPublicKey}
                    required
                    startAdornment={<GavelIcon fontSize="small" />}
                  />
                </Box>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
            <Stack spacing={1.25}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  {t('settings.explorer')}
                </Typography>
              </Box>
              <Stack spacing={1.25}>
                {chainEntries.map(([key, meta]) => {
                  const chainName = getChainName(key) ?? key;
                  const chainLabel = chainName.charAt(0).toUpperCase() + chainName.slice(1);
                  const chainIcon = getChainIconPath(key);
                  return (
                    <Box key={key} sx={{ width: '100%' }}>
                      <FormLabel
                        component="legend"
                        sx={{ paddingBottom: 0.5, color: 'text.secondary' }}>
                        {chainLabel} ({meta.currencySymbol})
                      </FormLabel>
                      <CustomInput
                        type="text"
                        placeholder={meta.explorerUrl}
                        register={register(`explorers.${key}` as const)}
                        error={errors.explorers?.[key]}
                        required
                        startAdornment={
                          <Avatar
                            src={chainIcon}
                            alt={`${chainLabel} icon`}
                            sx={{ width: 20, height: 20, bgcolor: 'background.default' }}>
                            {chainLabel[0]?.toUpperCase()}
                          </Avatar>
                        }
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}>
            <FormControl component="fieldset" margin="normal" fullWidth>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PublicOutlinedIcon fontSize="small" color="primary" />
                <FormLabel component="legend" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {t('settings.network')}
                </FormLabel>
              </Box>
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
          </Paper>

          <Box mt={1} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onReset} variant="outlined" color="secondary" size="small">
              {t('settings.reset')}
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {t('settings.save')}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default SettingsModal;
