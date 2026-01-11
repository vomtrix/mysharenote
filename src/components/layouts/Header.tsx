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
import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
  const { t } = useTranslation();
  return (
    <AppBar position="fixed" className={styles.header}>
      <Toolbar disableGutters className={styles.toolbar}>
        <Box>
          <Link href="/" passHref>
            <Image
              src="/assets/icon.svg"
              alt="Mobile Logo"
              className={styles.mobileLogo}
              width={65}
              height={50}
            />
          </Link>
          <Link href="/" passHref>
            <Image
              src="/assets/logo.svg"
              alt="Logo"
              className={styles.logo}
              width={170}
              height={64}
            />
          </Link>
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
