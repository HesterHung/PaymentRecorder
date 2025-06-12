const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';
export const PRIMARY_COLOR = '#218deb';  // Add this line

export const Colors = {
  light: {
    text: '#11181C',
    background: '#f2f2f2',
    tint: tintColorLight,
    icon: '#687076',
    card: '#ffffff',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: PRIMARY_COLOR,  // Add this line
    bottomTabBar: "#fffff",
    borderColor: "#F3F4F6"
  },
  dark: {
    text: '#ECEDEE',
    background: '#383838',
    tint: tintColorDark,
    icon: '#cdd1d4',
    card: '#666666',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: PRIMARY_COLOR,  // Add this line
    bottomTabBar: "#191919",
    borderColor: "#575656"
  },
};
export const USER_COLORS = ['#79baf2', '#74d4bc'] as const;
export type UserColorIndex = 0 | 1;