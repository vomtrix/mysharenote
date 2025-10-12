import { AreaSeries, createChart, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
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
  valueFormatter?: (value: number) => any;
}

const CustomChart = ({
  dataPoints,
  height = 300,
  lineColor = undefined as unknown as string,
  areaTopColor = CHART_AREA_TOP_COLOR,
  areaBottomColor = CHART_AREA_BOTTOM_COLOR,
  valueFormatter
}: CustomChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();

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
        secondsVisible: false
      }
    });

    const effectiveLineColor = lineColor || theme.palette.primary.main;
    areaSeriesRef.current = chartRef.current.addSeries(AreaSeries, {
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineColor: effectiveLineColor,
      lineWidth: 2,
      title:
        valueFormatter && dataPoints.length
          ? valueFormatter(dataPoints[dataPoints.length - 1].value)
          : dataPoints.length
          ? dataPoints[dataPoints.length - 1].value.toString()
          : ''
    });

    areaSeriesRef.current.setData(dataPoints);

    const legend = document.createElement('div');
    legend.style.cssText = `
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 1;
  font-size: 16px;
  line-height: 15px;
  font-weight: 300;
  color: ${theme.palette.primary.main};
`;
    containerRef.current.appendChild(legend);

    chartRef.current.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size || !areaSeriesRef.current) {
        legend.style.display = 'none'; // Hide legend if there's no data
        return;
      }

      const data = param.seriesData.get(areaSeriesRef.current);

      if (!data) {
        legend.style.display = 'none'; // Hide if data is not found
        return;
      }

      const lineData = data as LineData;
      const priceFormatted = valueFormatter
        ? valueFormatter(lineData.value)
        : lineData.value.toFixed(2);

      legend.style.display = 'block'; // Show legend when data is present
      legend.innerHTML = `<strong>${priceFormatted}</strong>`;
    });

    chartRef.current.timeScale().fitContent();

    return () => {
      chartRef.current?.remove();
    };
  }, [
    height,
    lineColor,
    areaTopColor,
    areaBottomColor,
    dataPoints,
    valueFormatter,
    theme.palette.primary.main
  ]);

  useEffect(() => {
    if (areaSeriesRef.current && dataPoints.length > 0) {
      areaSeriesRef.current.setData(dataPoints);
    }
  }, [dataPoints]);

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
