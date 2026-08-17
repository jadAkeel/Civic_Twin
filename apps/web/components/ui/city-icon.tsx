import { cn } from "@/lib/cn";

export type CityIconName =
  | "admin"
  | "ask-city"
  | "building"
  | "check"
  | "dashboard"
  | "dollar"
  | "green-score"
  | "logout"
  | "map"
  | "mobility"
  | "predictions"
  | "reports"
  | "simulator"
  | "trend"
  | "user"
  | "walk"
  | "warning"
  | "waste";

const paths: Record<CityIconName, React.ReactNode> = {
  dashboard: <><path d="M4 13h6V4H4z" /><path d="M14 20h6V11h-6z" /><path d="M4 20h6v-3H4z" /><path d="M14 7h6V4h-6z" /></>,
  map: <><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2z" /><path d="M8 4v13M16 7v13" /></>,
  reports: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  "green-score": <><path d="M19 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 9-15Z" /><path d="M5 20c2-5 6-8 11-11" /></>,
  mobility: <><path d="M5 16h14l-2-6H7z" /><path d="M7 10l2-4h6l2 4" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>,
  simulator: <><path d="M9 3v5l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V3" /><path d="M8 3h8M7 15h10" /></>,
  predictions: <><path d="M4 19V9M10 19V5M16 19v-8M22 19H2" /><path d="m4 9 6-4 6 6 5-7" /></>,
  "ask-city": <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 2 3 3 7 3s7-1 7-3V5M5 12v7c0 2 3 3 7 3s7-1 7-3v-7" /></>,
  admin: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4V21a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H2.8v-4H3a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V2.8h4V3a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21 10h.2v4H21a1.8 1.8 0 0 0-1.6 1Z" /></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  building: <><path d="m3 10 9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 20h18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  trend: <><path d="M4 19V9M10 19v-5M16 19V5M22 19H2" /><path d="m4 9 6-5 6 4 5-5" /></>,
  dollar: <><path d="M12 2v20" /><path d="M17 6.5c0-1.4-2.2-2.5-5-2.5S7 5.1 7 6.5 9.2 9 12 9s5 1.1 5 2.5S14.8 14 12 14s-5 1.1-5 2.5S9.2 19 12 19s5-1.1 5-2.5" /></>,
  walk: <><circle cx="13" cy="4" r="2" /><path d="m10 9 3-2 3 3M13 7l-2 6-4 3M11 13l4 3 2 5" /></>,
  warning: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5M12 17h.01" /></>,
  waste: <><path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
};

export function CityIcon({ name, className }: { name: CityIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}
