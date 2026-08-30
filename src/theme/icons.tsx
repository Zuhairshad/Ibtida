// Icon set ported 1:1 from the SVG defs in `Ibadah v5.dc.html`'s SVG object.
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

export const HomeIcon = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

export const PrayerIcon = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5.5 20v-8.5a6.5 6.5 0 0 1 13 0V20" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M3 20h18M12 4.4V2.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const AdhkarIcon = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={7.6} stroke={color} strokeWidth={1.7} />
    <Circle cx={12} cy={4.4} r={1.8} fill={color} />
  </Svg>
);

export const CommunityIcon = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={9} r={3.1} stroke={color} strokeWidth={1.7} />
    <Path d="M3.6 19c0-3 2.4-5 5.4-5s5.4 2 5.4 5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M16.2 7.3a3 3 0 0 1 0 5.5M17.8 19c0-2.1-.8-3.8-1.9-4.9" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const ProfileIcon = ({ size = 22, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 20v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const BeadsIcon = ({ size = 21, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={7.4} stroke={color} strokeWidth={1.7} />
    <Circle cx={12} cy={4.6} r={1.7} fill={color} />
  </Svg>
);

export const BookIcon = ({ size = 21, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" stroke={color} strokeWidth={1.7} />
    <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z" stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const SunIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={4.4} stroke={color} strokeWidth={1.7} />
    <Path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const SunriseIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3.5 18h17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M7.4 18a4.6 4.6 0 0 1 9.2 0" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M12 3.2v3.4M6.6 7.4l1.7 1.7M17.4 7.4l-1.7 1.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M9.6 5.4L12 3l2.4 2.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SundownIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3.5 18h17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M7.4 18a4.6 4.6 0 0 1 9.2 0" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M12 6.6V3.2M6.6 7.4l1.7 1.7M17.4 7.4l-1.7 1.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M9.6 4.4L12 6.8l2.4-2.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DuskIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={11.4} r={4.2} stroke={color} strokeWidth={1.7} />
    <Path d="M3.6 19.4h16.8M12 3.4v1.8M5.6 6.6l1.3 1.3M18.4 6.6l-1.3 1.3" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const MoonIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 14.6A8.4 8.4 0 0 1 9.4 4a8.4 8.4 0 1 0 10.6 10.6z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

export const TimerIcon = ({ size = 21, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={7.4} stroke={color} strokeWidth={1.7} />
    <Path d="M12 7.8V12l2.9 1.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const ChevronRightIcon = ({ size = 16, color = '#B9BEB7' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3.5L10.5 8 6 12.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronLeftIcon = ({ size = 15, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M10 3.5L5.5 8 10 12.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronDownIcon = ({ size = 12, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6.5L8 10.5 12 6.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon = ({ size = 16, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Path d="M2.4 6.3l2.5 2.5L9.7 3.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PinIcon = ({ size = 11, color = '#697382' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M8 14.5s5-4.2 5-8a5 5 0 1 0-10 0c0 3.8 5 8 5 8z" stroke={color} strokeWidth={1.4} />
    <Circle cx={8} cy={6.4} r={1.6} stroke={color} strokeWidth={1.4} />
  </Svg>
);

export const BellIcon = ({ size = 20, color = '#5B6472' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M4 8a6 6 0 0 1 12 0c0 3.4 1.2 4.6 1.6 5H2.4c.4-.4 1.6-1.6 1.6-5z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M8 15.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const ArrowRightIcon = ({ size = 15, color = '#FFFFFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3.5L10.5 8 6 12.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const QiblaIcon = ({ size = 15, color = '#2A63B8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8.6} stroke={color} strokeWidth={1.7} />
    <Path d="M15.2 8.8l-2 4.4-4.4 2 2-4.4z" fill={color} />
  </Svg>
);

export const TrendUpIcon = ({ size = 12, color = '#5EAA78' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Path d="M6 9.5V2.5M6 2.5L3 5.5M6 2.5l3 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PlusIcon = ({ size = 16, color = '#5EAA78' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const SearchIcon = ({ size = 16, color = '#B9BEB7' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Circle cx={7} cy={7} r={4.6} stroke={color} strokeWidth={1.5} />
    <Path d="M10.6 10.6L14 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const WarningIcon = ({ size = 16, color = '#8A6B24' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1.8l6 11.4H2z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    <Path d="M8 6.4v3M8 11.4v.1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const OfflineIcon = ({ size = 24, color = '#68716C' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8a12 12 0 0 1 16 0M7.5 12a8 8 0 0 1 9 0M12 17.5v.1" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M4 4l16 16" stroke="#C96B6B" strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const BookmarkIcon = ({ size = 16, color = '#B9BEB7' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Path d="M4.5 2.5h9v13l-4.5-3.4L4.5 15.5z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

export const PlayIcon = ({ size = 16, color = '#B9BEB7' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Circle cx={9} cy={9} r={6.5} stroke={color} strokeWidth={1.5} />
    <Path d="M7.5 6.4l4 2.6-4 2.6z" fill={color} />
  </Svg>
);

export const MoreIcon = ({ size = 16, color = '#B9BEB7' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Circle cx={4} cy={9} r={1.4} fill={color} />
    <Circle cx={9} cy={9} r={1.4} fill={color} />
    <Circle cx={14} cy={9} r={1.4} fill={color} />
  </Svg>
);

export const NavCompassIcon = ({ size = 104, angleDeg, color = '#2A63B8' }: IconProps & { angleDeg: number }) => (
  <Svg width={size} height={size} viewBox="0 0 104 104" fill="none" style={{ transform: [{ rotate: `${angleDeg}deg` }] }}>
    <Path d="M52 14l9 30-9-6-9 6z" fill={color} />
    <Path d="M52 90l-7-24 7 4 7-4z" fill="#C7D2E0" />
  </Svg>
);

export const CalendarIcon = HomeIcon;
