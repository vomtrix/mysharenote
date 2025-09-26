import LanguageSwitcher from '@components/common/LanguageSwitcher';
import SocialLinks from '@components/common/SocialLinks';
import Connect from '@components/Connect';
import { FAQ_LINKS } from '@config/config';
import { Box, Link as MuiLink } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { SECONDARY_COLOR } from '@styles/colors';
import styles from '@styles/scss/Header.module.scss';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t } = useTranslation();
  return (
    <AppBar position="fixed" className={styles.header}>
      <Toolbar disableGutters className={styles.toolbar}>
        <Box>
          <Link href="/" passHref>
            <Image
              src="/assets/logo.svg"
              alt="Mobile Logo"
              className={styles.mobileLogo}
              width={120}
              height={48}
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
        <Connect />

        <div className={styles.rightContent}>
          <MuiLink
            sx={{ pr: 2, display: { xs: 'none', md: 'block' } }}
            href={FAQ_LINKS.shareNote}
            target="_blank"
            rel="noopener noreferrer"
            color={SECONDARY_COLOR}>
            {t('header.shareNote')}
          </MuiLink>
          <SocialLinks />
          <LanguageSwitcher />
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
