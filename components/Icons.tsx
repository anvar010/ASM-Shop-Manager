/**
 * Stroke icons on a 24px grid. Sized by the `size` prop, coloured by `color`
 * (defaults to currentColor so they inherit from their container).
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

function base(size: number, color: string, style?: React.CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
  };
}

export function IconHome({ size = 22, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function IconBill({ size = 22, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M6 3h12v17l-2-1.2L14 20l-2-1.2L10 20l-2-1.2L6 20V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconNote({ size = 22, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export function IconBox({ size = 22, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </svg>
  );
}

export function IconBars({ size = 22, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <rect x="4" y="10" width="3.5" height="10" rx="0.75" />
      <rect x="10.25" y="5" width="3.5" height="15" rx="0.75" />
      <rect x="16.5" y="13" width="3.5" height="7" rx="0.75" />
    </svg>
  );
}

export function IconTrend({ size = 14, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

export function IconAlert({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="16.5" r="0.75" fill={color} stroke="none" />
    </svg>
  );
}

export function IconPlus({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} strokeWidth={2.25} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconMinus({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} strokeWidth={2.25} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconPencil({ size = 13, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export function IconTrash({ size = 13, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconCalendar({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconChevron({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconSearch({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconBackspace({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg {...base(size, color, style)} aria-hidden="true">
      <path d="M21 5H9L3 12l6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <line x1="17" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="17" y2="15" />
    </svg>
  );
}
