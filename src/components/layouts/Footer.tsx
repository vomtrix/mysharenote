import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CustomModal from '@components/common/CustomModal';
import SettingsModal from '@components/modals/SettingsModal';
import styles from '@styles/scss/Footer.module.scss';
import { useHasRelayConfig } from '@hooks/useHasRelayConfig';
import { useNotification } from '@hooks/UseNotificationHook';
import { getError, getRelayReady } from '@store/app/AppSelectors';
import { useDispatch, useSelector } from '@store/store';
import { setSkeleton } from '@store/app/AppReducer';
import { useTheme } from '@mui/material/styles';
import DarkModeToggle from '@components/common/DarkModeToggle';

const Footer = () => {
  const { t } = useTranslation();
  const { showError } = useNotification();
  const hasConfig = useHasRelayConfig();
  const dispatch = useDispatch();
  const error = useSelector(getError);
  const relayIsReady = useSelector(getRelayReady);
  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  const handleOpenSettingsModal = () => {
    dispatch(setSkeleton(true));
    setOpenSettingsModal(true);
  };

  const handleCloseSettingsModal = () => {
    if (hasConfig) {
      dispatch(setSkeleton(false));
      setOpenSettingsModal(false);
    }
  };

  useEffect(() => {
    if (hasConfig === false) {
      handleOpenSettingsModal();
      showError({
        message: t('missingRelayConfig'),
        options: {
          position: 'bottom-center',
          toastId: 'missing-relay-config'
        }
      });
    } else if (hasConfig) {
      dispatch(setSkeleton(false));
    }
  }, [hasConfig]);

  useEffect(() => {
    if (error || hasConfig === false || relayIsReady === false) {
      handleOpenSettingsModal();
    } else {
      handleCloseSettingsModal();
    }
  }, [error, hasConfig, relayIsReady]);

  const theme = useTheme();
  return (
    <footer
      className={styles.footer}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.secondary
      }}>
      <DarkModeToggle />
      <p style={{ flex: 1, textAlign: 'center' }}>{t('footer.title')}</p>
      <Tooltip title={t('settings.title')}>
        <IconButton onClick={handleOpenSettingsModal}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <CustomModal
        open={openSettingsModal}
        handleClose={handleCloseSettingsModal}
        size="small"
        hideCloseButton={!hasConfig}>
        <SettingsModal close={handleCloseSettingsModal} />
      </CustomModal>
    </footer>
  );
};

export default Footer;
