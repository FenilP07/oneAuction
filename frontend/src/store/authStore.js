import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from '../utils/apiClient.js';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        setAuthToken(accessToken);
        set({ user, accessToken });
      },
      clearAuth: () => {
        setAuthToken(null);
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;