import { create } from 'zustand'

interface ConfigState {
  appName: string;
}

export const useConfigStore = create<ConfigState>(() => ({
  appName: 'BarraStock',
}))
