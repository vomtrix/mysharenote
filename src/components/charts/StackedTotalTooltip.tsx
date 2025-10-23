import React from 'react';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ChartsTooltipContainer, useAxesTooltip } from '@mui/x-charts';

type Props = {
  valueFormatter: (v: number) => string;
};

const StackedTotalTooltip: React.FC<Props> = ({ valueFormatter }) => {
  const tooltipData = useAxesTooltip();
  if (!tooltipData) return null;

  return (
    <ChartsTooltipContainer trigger="axis">
      {tooltipData.map(({ axisId, axisFormattedValue, seriesItems }) => {
        const total = seriesItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
        const formattedTotal = valueFormatter(total);
        return (
          <Box
            key={axisId}
            sx={(theme) => ({
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              minWidth: 220
            })}>
            <Box
              component="div"
              sx={(theme) => ({
                borderBottom: `1px solid ${theme.palette.divider}`,
                px: 1.5,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              })}>
              <Typography variant="caption">{axisFormattedValue}</Typography>
              <Chip size="small" label={formattedTotal} />
            </Box>
            <Box component="table" sx={{ borderSpacing: 0, width: '100%' }}>
              <tbody>
                {seriesItems.map(({ seriesId, color, formattedValue, formattedLabel }) => {
                  if (formattedValue == null) return null;
                  return (
                    <tr key={String(seriesId)}>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            bgcolor: color,
                            borderRadius: 0.5,
                            mr: 1
                          }}
                        />
                        <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                          {formattedLabel || ''}
                        </Typography>
                      </td>
                      <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                        <Typography component="span" variant="body2">
                          {formattedValue}
                        </Typography>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        );
      })}
    </ChartsTooltipContainer>
  );
};

export default StackedTotalTooltip;
