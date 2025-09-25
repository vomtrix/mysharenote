import { useTranslation } from 'react-i18next';
import { Box } from '@mui/material';
import styles from '@styles/scss/404.module.scss';

const Custom404 = () => {
  const { t } = useTranslation();
  return (
    <Box className={styles.pageContainer}>
      <Box className={styles.contentContainer}>
        <Box className={styles.errorCode}>404</Box>
        <Box>
          <Box className={styles.errorMessage}>{t('pageNotFound')}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Custom404;
(Custom404 as any).hideChrome = true;
