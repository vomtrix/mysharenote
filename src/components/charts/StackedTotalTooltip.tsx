import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { ChartsTooltipContainer, useAxesTooltip } from '@mui/x-charts';

type Props = {
  valueFormatter: (v: number) => string;
  totalFormatter?: (v: number) => string;
  axisEventCounts?: Record<string, number>;
  eventCountFormatter?: (count: number) => string;
  axisSeriesCounts?: Record<string, Record<string, number>>;
  renderTotalValue?: (params: {
    total: number;
    formattedTotal: string | number;
    count?: number;
  }) => React.ReactNode;
  renderSeriesValue?: (params: {
    formattedValue: string | number | null | undefined;
    value: number | null | undefined;
    seriesId: string | number;
    formattedLabel?: string | null;
    color?: string;
    count?: number;
  }) => React.ReactNode;
};

const StackedTotalTooltip: React.FC<Props> = ({
  valueFormatter,
  totalFormatter,
  axisEventCounts,
  axisSeriesCounts,
  eventCountFormatter,
  renderTotalValue,
  renderSeriesValue
}) => {
  const tooltipData = useAxesTooltip();
  if (!tooltipData) return null;

  return (
    <ChartsTooltipContainer trigger="axis">
      {tooltipData.map(({ axisId, axisFormattedValue, seriesItems }) => {
        const total = seriesItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
        const formattedTotal = (totalFormatter ?? valueFormatter)(total);
        const eventCount =
          axisFormattedValue && axisEventCounts ? axisEventCounts[axisFormattedValue] : undefined;
        const renderedTotal = renderTotalValue
          ? renderTotalValue({ total, formattedTotal, count: eventCount })
          : formattedTotal;
        const seriesCountMap =
          axisFormattedValue && axisSeriesCounts ? axisSeriesCounts[axisFormattedValue] : undefined;
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
              <Chip size="small" label={renderedTotal ?? formattedTotal} />
              {typeof eventCount === 'number' && (
                <Typography variant="caption" color="text.secondary">
                  x{eventCountFormatter ? eventCountFormatter(eventCount) : `${eventCount} events`}
                </Typography>
              )}
            </Box>
            <Box component="table" sx={{ borderSpacing: 0, width: '100%' }}>
              <tbody>
                {seriesItems.map(({ seriesId, color, formattedValue, formattedLabel, value }) => {
                  if (formattedValue == null) return null;
                  const seriesCount =
                    seriesCountMap && seriesCountMap[String(seriesId)] !== undefined
                      ? seriesCountMap[String(seriesId)]
                      : undefined;
                  const renderedValue = renderSeriesValue
                    ? renderSeriesValue({
                        formattedValue,
                        value: (value as number | null | undefined) ?? null,
                        seriesId,
                        formattedLabel,
                        color,
                        count: seriesCount
                      })
                    : formattedValue;
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
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: 'text.secondary' }}>
                          {formattedLabel || ''}
                        </Typography>
                      </td>
                      <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                        <Typography component="span" variant="body2">
                          {renderedValue ?? '--'}
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
