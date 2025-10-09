import { DARK_MODE_DEFAULT, DARK_MODE_ENABLED, DARK_MODE_FORCE } from '@config/config';
import { Container } from '@mui/material';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { setColorMode } from '@store/app/AppReducer';
import { getColorMode } from '@store/app/AppSelectors';
import { AppStore, persistor, useDispatch, useSelector } from '@store/store';
import { ColorModeContext } from '@styles/ColorModeContext';
import { SECONDARY_GREY_3 } from '@styles/colors';
import '@styles/scss/globals.scss';
import customTheme from '@styles/theme';
import '@utils/dayjsSetup';
import '@utils/i18n';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Script from 'next/script';
import { PropsWithChildren, useMemo } from 'react';
import { Provider } from 'react-redux';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PersistGate } from 'redux-persist/integration/react';
import 'reflect-metadata';

const App = (props: any) => {
  const { Component, pageProps } = props;
  const outerTheme: any = useTheme();
  const Header = dynamic(() => import('@components/layouts/Header'), { ssr: false });
  const Footer = dynamic(() => import('@components/layouts/Footer'), { ssr: false });
  const hideChrome = (Component as any)?.hideChrome === true;

  return (
    <Provider store={AppStore}>
      <PersistGate persistor={persistor}>
        <Head>
          <title>ViaFLC</title>
          <meta name="description" content="ViaFLC - More Coins Same Power" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/assets/favicon-96x96.png" sizes="96x96"></link>
          <link rel="icon" href="/assets/favicon.ico" type="image/x-icon" />
          <link rel="shortcut icon" href="/assets/favicon.ico"></link>
          <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png"></link>
          <meta name="apple-mobile-web-app-title" content="ViaFLC"></meta>
          <link rel="manifest" href="/assets/site.webmanifest"></link>
        </Head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-57MPTSDC1R"
          strategy="afterInteractive"
        />
        <Script id="ga-gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('js', new Date());
            gtag('config', 'G-57MPTSDC1R');
          `}
        </Script>
        <ModeThemeProvider>
          {!hideChrome && <Header />}
          <Container
            sx={{
              marginTop: hideChrome ? 0 : '69px',
              px: { xs: 1, md: 5 },
              py: { xs: 1, md: 1 },
              display: 'flex',
              flexDirection: 'column',
              minHeight: hideChrome ? '100vh' : undefined,
              maxWidth: '100% !important'
            }}>
            <Component {...pageProps} />
          </Container>

          {!hideChrome && <Footer />}
        </ModeThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;

// Internal provider to initialize theme from Redux store (after Provider is mounted)
function ModeThemeProvider({ children }: PropsWithChildren) {
  const outerTheme: any = useTheme();
  const dispatch = useDispatch();
  const storedMode = useSelector(getColorMode) || DARK_MODE_DEFAULT;
  const mode: 'light' | 'dark' = DARK_MODE_FORCE ? 'dark' : storedMode;
  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () => {
        if (!DARK_MODE_ENABLED || DARK_MODE_FORCE) return;
        dispatch(setColorMode(mode === 'light' ? 'dark' : 'light'));
      },
      setMode: (m: 'light' | 'dark') => {
        if (!DARK_MODE_ENABLED || DARK_MODE_FORCE) return;
        dispatch(setColorMode(m));
      }
    }),
    [mode, dispatch]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={customTheme(outerTheme, mode)}>
        <GlobalStyles
          styles={(theme) => ({
            body: {
              backgroundColor:
                mode === 'light'
                  ? `${SECONDARY_GREY_3} !important`
                  : `${theme.palette.background.default} !important`,
              color: theme.palette.text.primary
            }
          })}
        />
        {children}
        <ToastContainer
          className="custom-toast-container"
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={mode}
          transition={Bounce}
        />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
