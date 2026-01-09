import { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & {
  strokeColor?: string;
  accentColor?: string;
};

const WorkerCircuitIcon = ({ strokeColor, accentColor, ...props }: Props) => {
  const stroke = strokeColor || '#0f5a34';
  const accent = accentColor || stroke;

  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      role="presentation"
      {...props}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 10.9 16 4l11.2 6.9" stroke={stroke} strokeWidth="1.9" />
        <path d="M3.5 13h25" stroke={stroke} strokeWidth="1.9" />
        <path d="M4 24h24.5" stroke={stroke} strokeWidth="1.9" />
        <path d="M3.8 27.2H28" stroke={stroke} strokeWidth="1.9" />
        <path d="M8.6 12.6v11.4" stroke={stroke} strokeWidth="1.9" />
        <path d="M15.9 12.6v11.4" stroke={stroke} strokeWidth="1.9" />
        <path d="M23.4 12.6v11.4" stroke={stroke} strokeWidth="1.9" />
        <path d="M7.4 23.8h2.5" stroke={stroke} strokeWidth="1.9" />
        <path d="M14.7 23.8h2.5" stroke={stroke} strokeWidth="1.9" />
        <path d="M22 23.8h2.5" stroke={stroke} strokeWidth="1.9" />
        <path d="M9.1 16.1c1.6 1.1 1.6 2.7 0 3.8" stroke={accent} strokeWidth="1.5" />
        <path d="M16.3 16.1c1.6 1.1 1.6 2.7 0 3.8" stroke={accent} strokeWidth="1.5" />
        <path d="M23.5 16.1c1.6 1.1 1.6 2.7 0 3.8" stroke={accent} strokeWidth="1.5" />
        <path d="M5.9 23.3c1.2-.6 2-.4 2.7.7" stroke={accent} strokeWidth="1.5" />
        <path d="M13.1 23.3c1.2-.6 2-.4 2.7.7" stroke={accent} strokeWidth="1.5" />
        <path d="M20.4 23.3c1.2-.6 2-.4 2.7.7" stroke={accent} strokeWidth="1.5" />
        <path d="M8.2 14.2c-1 .4-2.2.2-3-.6" stroke={accent} strokeWidth="1.5" />
        <path d="M24 14.2c1 .4 2.2.2 3-.6" stroke={accent} strokeWidth="1.5" />
        <path d="M16 10.6v2.3" stroke={accent} strokeWidth="1.4" />
        <path d="M13.4 9.1 9.3 12.4" stroke={accent} strokeWidth="1.4" />
        <path d="M18.6 9.1 22.7 12.4" stroke={accent} strokeWidth="1.4" />
      </g>

      <g fill={stroke}>
        <circle cx="16" cy="7.5" r="1.1" />
        <circle cx="13.3" cy="8.7" r="0.85" />
        <circle cx="18.7" cy="8.7" r="0.85" />
        <circle cx="16" cy="10.6" r="0.75" />
        <circle cx="8.6" cy="18" r="0.9" />
        <circle cx="15.9" cy="18" r="0.9" />
        <circle cx="23.4" cy="18" r="0.9" />
        <circle cx="6.5" cy="23.8" r="0.9" />
        <circle cx="13.8" cy="23.8" r="0.9" />
        <circle cx="21.1" cy="23.8" r="0.9" />
        <circle cx="3.5" cy="13" r="0.75" />
        <circle cx="28.5" cy="13" r="0.75" />
        <circle cx="4" cy="24" r="0.75" />
        <circle cx="28.5" cy="24" r="0.75" />
        <circle cx="4.4" cy="27.2" r="0.75" />
        <circle cx="27.5" cy="27.2" r="0.75" />
      </g>
    </svg>
  );
};

export default WorkerCircuitIcon;
