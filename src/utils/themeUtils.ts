/**
 * Helper to compute solid accent styling for buttons, active pills, badges, and tabs.
 * Restores solid white in dark/OLED theme and solid vibrant accent colors.
 */
export const getAccentStyle = (accentHex: string, isDark: boolean = true) => {
  const isWhite = accentHex === '#ffffff' || accentHex === '#fff' || accentHex === '#000000';

  if (isWhite) {
    return {
      backgroundColor: isDark ? '#ffffff' : '#0f172a',
      color: isDark ? '#0f172a' : '#ffffff',
      borderColor: 'transparent',
    };
  }

  return {
    backgroundColor: accentHex,
    color: '#ffffff',
    borderColor: 'transparent',
  };
};
