// src/lib/drakon/themeAdapter.ts

import type { DrakonConfigTheme } from '@/types/drakonwidget';

/**
 * Maps garden-bloom theme (dark/light) to DrakonWidget theme
 */
export function getGardenDrakonTheme(isDark: boolean): DrakonConfigTheme {
  if (isDark) {
    return {
      background: '#1e293b',
      iconBack: '#334155',
      iconBorder: '#64748b',
      color: '#f1f5f9',
      lines: '#94a3b8',
      lineWidth: 1,
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowBlur: 4,
      scrollBar: 'rgba(255, 255, 255, 0.2)',
      scrollBarHover: 'rgba(255, 255, 255, 0.5)',
      backText: '#cbd5e1',
    };
  }

  // Light theme — higher contrast: gray canvas, white blocks, dark borders/lines
  return {
    background: '#dde3ea',
    iconBack: '#ffffff',
    iconBorder: '#5b6e82',
    color: '#1a2535',
    lines: '#2d3f52',
    lineWidth: 1.5,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowBlur: 6,
    scrollBar: 'rgba(0, 0, 0, 0.2)',
    scrollBarHover: 'rgba(0, 0, 0, 0.45)',
    backText: '#3a4e63',
  };
}
