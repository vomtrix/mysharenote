import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
import GlassCard from '@components/styled/GlassCard';
import { useTranslation } from 'react-i18next';
import { FAQ_LINKS } from 'src/config/config';
import { PRIMARY_WHITE, PRIMARY_BLUE } from '@styles/colors';
import { alpha } from '@mui/material/styles';

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
          rel="noopener noreferrer"
          underline="hover"
          color={PRIMARY_BLUE}>
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: PRIMARY_WHITE }}>
            {t('faq.title')}
          </Typography>
          <Stack spacing={2}>
            {questions.map((item, idx) => (
              <Box key={idx}>
                <Typography sx={{ fontWeight: 600, color: PRIMARY_WHITE, mb: 0.5 }}>
                  {item.q}
                </Typography>
                <Typography sx={{ color: alpha(PRIMARY_WHITE, 0.9) }}>
                  {renderWithLinks(item.a, t)}
                </Typography>
                {idx < questions.length - 1 && <Divider sx={{ mt: 2, opacity: 0.08 }} />}
              </Box>
            ))}
          </Stack>
        </Box>
      </GlassCard>
    </Container>
  );
};

export default Faq;
