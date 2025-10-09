import GlassCard from '@components/styled/GlassCard';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PRIMARY_COLOR_1, PRIMARY_WHITE, SECONDARY_COLOR } from '@styles/colors';
import { useTranslation } from 'react-i18next';
import { FAQ_LINKS } from 'src/config/config';

const renderWithLinks = (text: string, t: any) => {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\[\[link:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const [full, id, labelKey] = match;
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const entry = FAQ_LINKS[id];
    if (entry) {
      const label = t(`faq.linkLabels.${labelKey}`);
      parts.push(
        <Link
          key={`${id}-${match.index}`}
          href={entry}
          target="_blank"
          underline="hover"
          color={SECONDARY_COLOR}>
          {label}
        </Link>
      );
    } else {
      parts.push(full);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
};

const Faq = () => {
  const { t } = useTranslation();
  const questions: { q: string; a: string }[] = t('faq.questions', { returnObjects: true }) as any;

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <GlassCard>
        <Box sx={{ p: 3 }}>
          {/* <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: PRIMARY_WHITE }}>
            {t('faq.title')}
          </Typography> */}
          <Stack spacing={2.5}>
            {questions.map((item, idx) => (
              <Box key={idx}>
                <Typography sx={{ fontSize: "large", fontWeight: 600, color: PRIMARY_WHITE, mb: 1 }}>
                    {item.q}
                  </Typography>
                  <Typography variant="body1" sx={{ color: alpha(PRIMARY_WHITE, 0.86), lineHeight: 1.65 }}>
                    {renderWithLinks(item.a, t)}
                  </Typography>
                {idx < questions.length - 1 && (
                  <Box
                    sx={{
                      mt: 2,
                      height: '1px',
                      width: '100%',
                      background: `linear-gradient(to right, transparent, ${PRIMARY_COLOR_1} 25%,${PRIMARY_COLOR_1} 75%, transparent)`,
                      filter: 'blur(0.5px)'
                    }}
                  />
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      </GlassCard>
    </Container>
  );
};

export default Faq;
