import { createSlice } from '@reduxjs/toolkit';
import { ThemeModeEnum } from '@/core/enums';

type ThemeState = {
  value: ThemeModeEnum;
};

const initialState = {
  value: ThemeModeEnum.Light,
} as ThemeState;

export const theme = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    reset: () => initialState,
    light: (state) => {
      state.value = ThemeModeEnum.Light;
    },
    dark: (state) => {
      state.value = ThemeModeEnum.Dark;
    },
  },
});

export const { reset, light, dark } = theme.actions;
export default theme.reducer;
