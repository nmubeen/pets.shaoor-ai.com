import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  stroke: "currentColor",
  fill: "none" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const PawIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="7" cy="8" r="2.1" />
    <circle cx="12" cy="6" r="2.1" />
    <circle cx="17" cy="8" r="2.1" />
    <circle cx="19" cy="13" r="2.1" />
    <path d="M12 12c-3.5 0-6.5 2.6-6.5 5.6 0 1.8 1.5 2.9 3.3 2.4.9-.2 2.1-.5 3.2-.5s2.3.3 3.2.5c1.8.5 3.3-.6 3.3-2.4 0-3-3-5.6-6.5-5.6Z" />
  </svg>
);

export const StethoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3v6a4 4 0 0 0 8 0V3" />
    <circle cx="18.5" cy="16.5" r="2.5" />
    <path d="M9 13v1a5 5 0 0 0 10 0v-2" />
    <path d="M5 3H3M13 3h-2" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.4" />
  </svg>
);

export const VialIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 2h6M10 2v7.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V2" />
    <path d="M7.5 15h9" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-9.7-9.3C.6 6.9 3 3.5 6.6 3.5c2 0 3.6 1.1 5.4 3.1 1.8-2 3.4-3.1 5.4-3.1 3.6 0 6 3.4 4.3 7.2C19.5 15.4 12 20 12 20Z" />
    <path d="M8 11h2l1.3-2.3L13 13l1.3-2h1.7" />
  </svg>
);

export const CartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2.5 3h2.4l2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7.5H6.2" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 18 5.5-5.5a1.6 1.6 0 0 1 2.2 0L18 18" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M11 20V4M18 20v-7" />
    <path d="M2 20h20" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9.5h12V10" />
  </svg>
);

export const FishIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12s3.5-5 10-5 8 5 8 5-1.5 5-8 5-10-5-10-5Z" />
    <circle cx="16.5" cy="10.5" r=".8" fill="currentColor" stroke="none" />
    <path d="M3 12 1 9m2 3-2 3" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 3H4v7l10 10 7-7L11 3Z" />
    <circle cx="8" cy="8" r="1.3" />
  </svg>
);

export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
    <circle cx="17" cy="8.6" r="2.6" />
    <path d="M16 13.9c2.7.4 4.5 2.6 4.5 5.6" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 4.5 6v6c0 4.8 3.2 8.2 7.5 9 4.3-.8 7.5-4.2 7.5-9V6L12 3Z" />
    <path d="m8.5 12 2.4 2.4 4.6-4.8" />
  </svg>
);

export const KeyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="14.5" r="4" />
    <path d="M11 11.5 20 2.5M17 6l2.5 2.5M14 9l2 2" />
  </svg>
);

export const InvoiceIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h9l3 3v17H6V2Z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
);

export const RocketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3 3-3-3c-1-1-2-3-2-5 0-4 2-8 5-10Z" />
    <circle cx="12" cy="10" r="1.6" />
    <path d="M9 17c-2 1-2.5 3-2.5 5 2 0 4-.5 5-2.5M15 17c2 1 2.5 3 2.5 5-2 0-4-.5-5-2.5" />
  </svg>
);

export const DropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3s6.5 7 6.5 11.5A6.5 6.5 0 0 1 5.5 14.5C5.5 10 12 3 12 3Z" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M8 10h8M8 14h8M8 18h5" />
  </svg>
);

export const HeartFillIcon = (p: IconProps) => (
  <svg {...base(p)} fill={p.fill ?? "currentColor"}>
    <path d="M12 20s-7.5-4.6-9.7-9.3C.6 6.9 3 3.5 6.6 3.5c2 0 3.6 1.1 5.4 3.1 1.8-2 3.4-3.1 5.4-3.1 3.6 0 6 3.4 4.3 7.2C19.5 15.4 12 20 12 20Z" />
  </svg>
);

export const WeightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="9" width="4" height="6" rx="1.2" />
    <rect x="18" y="9" width="4" height="6" rx="1.2" />
    <path d="M6 12h3M15 12h3" />
    <rect x="9" y="7" width="6" height="10" rx="1.5" />
  </svg>
);

export const ChipIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4" />
  </svg>
);

export const PassportIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M9.5 16.5h5M8 3v2M16 3v2" />
  </svg>
);

export const HabitatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
  </svg>
);

export const ScissorsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="6" cy="18" r="2.2" />
    <path d="m20 4-12.5 12.5M7.6 7.6 20 20M9.5 12 8.2 13.3" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6 8.5 7 8.5-7" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 4h3.2l1.4 4.2-2 1.6a13 13 0 0 0 6.6 6.6l1.6-2 4.2 1.4V19a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
  </svg>
);

export const WhatsAppIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={1.5}>
    <path d="M4 20l1.3-4.4A8 8 0 1 1 8.7 19L4 20Z" />
    <path d="M8.3 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.4s.7 1.6.7 1.8 0 .3-.2.5l-.5.6c-.1.2-.2.3 0 .6.2.4.8 1.2 1.7 1.9 1.1 1 1.6 1.1 1.9 1s.4-.3.6-.6l.4-.6c.2-.3.4-.3.6-.2l1.5.7c.2.1.4.2.4.4 0 .5 0 1.1-.3 1.5-.3.4-1 .8-1.6.8-1.5.1-3.5-.6-5.2-2.2-1.7-1.6-2.6-3.4-2.7-4.9 0-.6.2-1.3.7-1.7Z" fill="currentColor" stroke="none" />
  </svg>
);
