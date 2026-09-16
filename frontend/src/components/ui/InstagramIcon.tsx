import React from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';

export interface InstagramIconProps {
  size?: number;
  color?: string;
}

export function InstagramIcon({ size = 24, color = '#FFFFFF' }: InstagramIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        stroke={color}
        strokeWidth="2"
      />
      <Circle
        cx="12"
        cy="12"
        r="4"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="17.5"
        y1="6.5"
        x2="17.51"
        y2="6.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default InstagramIcon;
