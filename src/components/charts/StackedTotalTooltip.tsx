import React, { useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useAxesTooltip, useSvgRef } from '@mui/x-charts';

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
  placement?: 'bottom-end' | 'bottom-start' | 'bottom' | 'left-end' | 'left-start' | 'left' | 'right-end' | 'right-start' | 'right' | 'top-end' | 'top-start' | 'top';
};

const StackedTotalTooltip: React.FC<Props> = ({
  valueFormatter,
  totalFormatter,
  axisEventCounts,
  axisSeriesCounts,
  eventCountFormatter,
  renderTotalValue,
  renderSeriesValue,
  placement
}) => {
  const theme = useTheme();
  const svgRef = useSvgRef();
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const anchorEl = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: positionRef.current.x,
        y: positionRef.current.y,
        top: positionRef.current.y,
        left: positionRef.current.x,
        right: positionRef.current.x,
        bottom: positionRef.current.y,
        width: 0,
        height: 0,
        toJSON: () => ''
      })
    }),
    []
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const update = (event: PointerEvent) => {
      positionRef.current = { x: event.clientX, y: event.clientY };
    };
    svg.addEventListener('pointermove', update);
    svg.addEventListener('pointerdown', update);
    svg.addEventListener('pointerenter', update);
    return () => {
      svg.removeEventListener('pointermove', update);
      svg.removeEventListener('pointerdown', update);
      svg.removeEventListener('pointerenter', update);
    };
  }, [svgRef]);

  const tooltipData = useAxesTooltip();
  if (!tooltipData) return null;

  return (
    <Popper
      open={true}
      placement={placement ?? 'top'}
      anchorEl={anchorEl as any}
      modifiers={[
        { name: 'offset', options: { offset: [0, 10] } },
        { name: 'preventOverflow', options: { altAxis: true } }
      ]}
      sx={{
        pointerEvents: 'none',
        zIndex: theme.zIndex.tooltip,
        '& .tooltip-surface': {
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: `0 6px 24px ${alpha(theme.palette.common.black, 0.18)}`
        }
      }}>
      {tooltipData.map(({ axisId, axisFormattedValue, seriesItems }) => {
        const visibleSeries = seriesItems.filter(
          (it) => typeof it.value === 'number' && Number(it.value) > 0
        );
        const total = visibleSeries.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
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
            className="tooltip-surface"
            sx={{
              color: theme.palette.text.primary,
              minWidth: 220,
              overflow: 'hidden'
            }}>
            <Box
              component="div"
              sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
                px: 1.5,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.95)
              }}>
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
                {visibleSeries.map(({ seriesId, color, formattedValue, formattedLabel, value }) => {
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
    </Popper>
  );
};

export default StackedTotalTooltip;
