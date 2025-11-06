import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface MetricPillProps {
  label: string;
  value: string;
}

const MetricPill = ({ label, value }: MetricPillProps) => {
  const trimmedValue = value.trim();
  const lastSpaceIndex = trimmedValue.lastIndexOf(' ');
  const hasUnit = lastSpaceIndex > 0;
  const numericValue = hasUnit ? trimmedValue.slice(0, lastSpaceIndex) : trimmedValue;
  const unitValue = hasUnit ? trimmedValue.slice(lastSpaceIndex + 1) : '';

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.2 },
        py: { xs: 0.4, sm: 0.55 },
        borderRadius: 1.5,
        display: 'inline-flex',
        alignItems: 'baseline',
        border: (theme) =>
          `1px solid ${
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(17,24,39,0.12)'
          }`,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(147, 119, 255, 0.08)'
            : 'rgba(111, 66, 193, 0.06)'
      }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: { xs: 0.6, sm: 0.8 },
          flexWrap: 'wrap'
        }}>
        <Typography
          variant="caption"
          sx={{
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontWeight: 600,
            fontSize: { xs: '0.56rem', sm: '0.64rem' },
            color: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.7)'
                : 'rgba(17,24,39,0.55)',
            display: {
              xs: 'none',
              sm: label ? 'inline' : 'none'
            }
        }}>
        {label}
      </Typography>
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '0.88rem', sm: '0.96rem' },
            color: (theme) => theme.palette.text.primary
          }}>
          {numericValue}
        </Typography>
        {unitValue && (
          <Typography
            component="span"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.88rem', sm: '0.96rem' },
              color: (theme) => theme.palette.text.secondary,
              display: { xs: 'none', sm: 'inline' }
            }}>
            {unitValue}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MetricPill;
