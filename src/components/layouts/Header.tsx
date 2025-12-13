import { useTranslation } from 'react-i18next';
import { FAQ_LINKS } from '@config/config';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LanguageSwitcher from '@components/common/LanguageSwitcher';
import SocialLinks from '@components/common/SocialLinks';
import Connect from '@components/Connect';
import DirectMessagesCenter from '@components/messages/DirectMessagesCenter';
import { PRIMARY_WHITE, SECONDARY_COLOR } from '@styles/colors';
import styles from '@styles/scss/Header.module.scss';

const Header = () => {
  const { t } = useTranslation();
  return (
    <AppBar position="fixed" className={styles.header}>
      <Toolbar disableGutters className={styles.toolbar}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              letterSpacing: -0.5,
              color: PRIMARY_WHITE,
              fontSize: { xs: '1.2rem', md: '1.7rem' }
            }}>
            myHashboard
          </Typography>
        </Box>
        <Box className={styles.connectWrapper}>
          <Connect />
        </Box>

        <div className={styles.rightContent} style={{ flexShrink: 0 }}>
          <MuiLink
            sx={{ pr: 2, display: { xs: 'none', md: 'block' } }}
            href={FAQ_LINKS.shareNote}
            target="_blank"
            color={SECONDARY_COLOR}>
            {t('header.shareNote')}
          </MuiLink>
          <DirectMessagesCenter iconSize="small" />
          <SocialLinks />
          <LanguageSwitcher />
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
