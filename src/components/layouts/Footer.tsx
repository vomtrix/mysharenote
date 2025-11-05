import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import CustomModal from '@components/common/CustomModal';
import DarkModeToggle from '@components/common/DarkModeToggle';
import SettingsModal from '@components/modals/SettingsModal';
import { useHasRelayConfig } from '@hooks/useHasRelayConfig';
import { useNotification } from '@hooks/UseNotificationHook';
import { setSkeleton } from '@store/app/AppReducer';
import { getError, getRelayReady } from '@store/app/AppSelectors';
import { useDispatch, useSelector } from '@store/store';
import styles from '@styles/scss/Footer.module.scss';

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
        <SettingsModal />
      </CustomModal>
    </footer>
  );
};

export default Footer;
