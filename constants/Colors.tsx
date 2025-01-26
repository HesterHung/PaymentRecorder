const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';
export const PRIMARY_COLOR = '#218deb';  // Add this line

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: PRIMARY_COLOR,  // Add this line
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: PRIMARY_COLOR,  // Add this line
  },
};
export const USER_COLORS = ['#5495eb', '#5bc6d4'] as const;
export type UserColorIndex = 0 | 1;