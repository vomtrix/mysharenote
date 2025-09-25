import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';

interface LoaderProps extends LinearProgressProps {
  value?: number;
}

const ProgressLoader = ({ value, ...otherProps }: LoaderProps) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        maxWidth: '300px',
        margin: 'auto',
        padding: 3
      }}>
      <Typography
        variant="body1"
        sx={{
          fontWeight: '600',
          marginBottom: '1rem' // Ajoutez un espace entre le texte et le loader
        }}>
        {t('loading')}
        {value ? Math.round(value) : null}
      </Typography>
      <LinearProgress {...otherProps} sx={{ width: '100%' }} />
    </Box>
  );
};

export default ProgressLoader;
