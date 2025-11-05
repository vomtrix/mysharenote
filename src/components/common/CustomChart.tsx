import {
  AreaSeries,
  createChart,
  IChartApi,
  type IRange,
  ISeriesApi,
  LineData,
  type Time
} from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { CHART_AREA_BOTTOM_COLOR, CHART_AREA_TOP_COLOR, SECONDARY_GREY_4 } from '@styles/colors';
// No date formatter here: we shift data timestamps at source

interface CustomChartProps {
  dataPoints: LineData[];
  height?: number;
  lineColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
  legendColor?: string;
  valueFormatter?: (value: number) => any;
}

const CustomChart = ({
  dataPoints,
  height = 300,
  lineColor = undefined as unknown as string,
  areaTopColor = CHART_AREA_TOP_COLOR,
  areaBottomColor = CHART_AREA_BOTTOM_COLOR,
  legendColor,
  valueFormatter
}: CustomChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const latestValueRef = useRef<number | undefined>(undefined);
  const visibleRangeRef = useRef<IRange<Time> | null>(null);
  const theme = useTheme();
  const effectiveLineColor = lineColor || theme.palette.primary.main;
  const effectiveLegendColor = legendColor || effectiveLineColor;

  useEffect(() => {
    if (!containerRef.current) return;

    const bg = theme.palette.mode === 'dark' ? SECONDARY_GREY_4 : theme.palette.background.paper;
    const text = theme.palette.text.primary;
    chartRef.current = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { attributionLogo: false, background: { color: bg }, textColor: text },
      rightPriceScale: {
        visible: false
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true
      }
    });

    areaSeriesRef.current = chartRef.current.addSeries(AreaSeries, {
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineColor: effectiveLineColor,
      lineWidth: 2
    });

    const initialSanitized = (dataPoints ?? [])
      .filter(
        (point): point is LineData =>
          point !== null &&
          point !== undefined &&
          typeof point.time === 'number' &&
          Number.isFinite(point.time) &&
          typeof point.value === 'number' &&
          Number.isFinite(point.value)
      )
      .sort((a, b) => (a.time as number) - (b.time as number))
      .reduce<LineData[]>((acc, point) => {
        const last = acc.at(-1);
        if (last && last.time === point.time) {
          acc[acc.length - 1] = point;
        } else {
          acc.push(point);
        }
        return acc;
      }, []);

    areaSeriesRef.current.setData(initialSanitized);

    const legend = document.createElement('div');
    legend.style.cssText = `
  position: absolute;
  right: 12px;
  top: 12px;
      z-index: 1;
      font-size: 16px;
      line-height: 15px;
      font-weight: 300;
      color: ${effectiveLegendColor};
  padding: 4px 8px;
  border-radius: 6px;
  background: ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)'};
  backdrop-filter: blur(4px);
`;
    containerRef.current.appendChild(legend);
    legendRef.current = legend;

    const formatValue = (value: number) =>
      valueFormatter ? valueFormatter(value) : value.toFixed(2);

    const updateLegend = (value?: number) => {
      if (!legendRef.current) return;
      legendRef.current.style.color = effectiveLegendColor;
      if (value === undefined || Number.isNaN(value)) {
        legendRef.current.style.display = 'none';
        legendRef.current.innerHTML = '';
      } else {
        legendRef.current.style.display = 'block';
        legendRef.current.innerHTML = `<strong>${formatValue(value)}</strong>`;
      }
    };

    latestValueRef.current = dataPoints.at(-1)?.value;
    updateLegend(latestValueRef.current);

    chartRef.current.subscribeCrosshairMove((param) => {
      if (!param?.seriesData.size || !areaSeriesRef.current) {
        updateLegend(latestValueRef.current);
        return;
      }

      const data = param.seriesData.get(areaSeriesRef.current) as LineData | undefined;
      if (!param.time || !data) {
        updateLegend(latestValueRef.current);
        return;
      }

      updateLegend(data.value);
    });

    const timeScale = chartRef.current.timeScale();
    timeScale.fitContent();
    visibleRangeRef.current = timeScale.getVisibleRange() ?? null;
    const handleRangeChange = (range: IRange<Time> | null) => {
      if (range) {
        visibleRangeRef.current = range;
      }
    };
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    let resizeCleanup: (() => void) | undefined;

    if (containerRef.current && 'ResizeObserver' in window) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !chartRef.current) return;
        const { width } = entry.contentRect;
        if (width > 0) {
          chartRef.current.applyOptions({ width, height });
        }
      });
      observer.observe(containerRef.current);
      resizeCleanup = () => observer.disconnect();
    } else {
      const handleResize = () => {
        if (!containerRef.current || !chartRef.current) return;
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height
        });
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      resizeCleanup = () => window.removeEventListener('resize', handleResize);
    }

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
      resizeCleanup?.();
      chartRef.current?.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
      legendRef.current = null;
    };
  }, [
    height,
    lineColor,
    areaTopColor,
    areaBottomColor,
    legendColor,
    valueFormatter,
    theme.palette.mode,
    theme.palette.primary.main
  ]);

  useEffect(() => {
    if (!areaSeriesRef.current) return;

    const sanitizedPoints = (dataPoints ?? [])
      .filter(
        (point): point is LineData =>
          point !== null &&
          point !== undefined &&
          typeof point.time === 'number' &&
          Number.isFinite(point.time) &&
          typeof point.value === 'number' &&
          Number.isFinite(point.value)
      )
      .sort((a, b) => (a.time as number) - (b.time as number))
      .reduce<LineData[]>((acc, point) => {
        const last = acc.at(-1);
        if (last && last.time === point.time) {
          acc[acc.length - 1] = point;
        } else {
          acc.push(point);
        }
        return acc;
      }, []);

    areaSeriesRef.current.setData(sanitizedPoints);
    latestValueRef.current = sanitizedPoints.at(-1)?.value;

    if (!legendRef.current) return;

    legendRef.current.style.color = effectiveLegendColor;

    const latest = latestValueRef.current;
    if (latest === undefined || Number.isNaN(latest)) {
      legendRef.current.style.display = 'none';
      legendRef.current.innerHTML = '';
    } else {
      legendRef.current.style.display = 'block';
      const formatted = valueFormatter ? valueFormatter(latest) : latest.toFixed(2);
      legendRef.current.innerHTML = `<strong>${formatted}</strong>`;
    }

    const timeScale = chartRef.current?.timeScale();
    const targetRange = visibleRangeRef.current;
    if (timeScale) {
      if (targetRange) {
        timeScale.setVisibleRange(targetRange);
      } else if (sanitizedPoints.length > 0) {
        timeScale.fitContent();
        visibleRangeRef.current = timeScale.getVisibleRange() ?? null;
      }
    }
  }, [dataPoints, valueFormatter, effectiveLegendColor]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height
      }}>
      <div ref={legendRef} />
    </div>
  );
};

export default CustomChart;
