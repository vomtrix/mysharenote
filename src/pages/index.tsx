import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { alpha } from '@mui/material/styles';
import { Box } from '@mui/system';
import LanguageSwitcher from '@components/common/LanguageSwitcher';
import SocialLinks from '@components/common/SocialLinks';
import Connect from '@components/Connect';
import Faq from '@components/Faq';
import { clearAddress } from '@store/app/AppReducer';
import { getAddress } from '@store/app/AppSelectors';
import { stopHashrates, stopPayouts, stopShares } from '@store/app/AppThunks';
import { useDispatch, useSelector } from '@store/store';
import { PRIMARY_BLACK, PRIMARY_COLOR, PRIMARY_COLOR_1, PRIMARY_COLOR_3 } from '@styles/colors';
import { HOME_PAGE_ENABLED } from 'src/config/config';

const Home = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const address = useSelector(getAddress);

  useEffect(() => {
    if (!HOME_PAGE_ENABLED) {
      if (address) router.replace(`/address/${address}`);
      else router.replace('/404');
      return;
    } else {
      dispatch(clearAddress());
      dispatch(stopHashrates());
      dispatch(stopShares());
      dispatch(stopPayouts());
    }
  }, [address]);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevBgColor = document.body.style.backgroundColor;
    document.body.style.background =
      'radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%), ' +
      `linear-gradient(135deg, ${PRIMARY_COLOR_1} 0%, ${PRIMARY_COLOR} 50%, ${PRIMARY_COLOR_3} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.backgroundColor = prevBgColor;
    };
  }, []);

  if (!HOME_PAGE_ENABLED) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 2,
        pt: { xs: '3vh', md: '8vh' }
      }}>
      <img src="/assets/logo.svg" alt="ShareNote" style={{ width: '260px', maxWidth: '70vw' }} />
      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          justifyContent: 'center'
        }}>
        <Connect hasButton />
      </Box>
      <Box sx={{ width: '100%', mt: { xs: 1, md: 6 }, pb: 7 }}>
        <Faq />
      </Box>

      <Box
        id="footer"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
          backgroundColor: alpha(PRIMARY_BLACK, 0.4),
          px: { xs: 1.5, md: 2.5 },
          py: { xs: 1, md: 1.5 },
          zIndex: 1200
        }}>
        <SocialLinks />
        <LanguageSwitcher />
      </Box>
    </Box>
  );
};

export default Home;

(Home as any).hideChrome = true;
