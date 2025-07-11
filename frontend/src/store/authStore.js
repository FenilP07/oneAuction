import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from '../utils/apiClient.js';

const useAuthStore = create(
  persist(
    (set,get) => ({
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
      isAdmin:()=>{
        const {user} = get();
        return user?.role === 'admin';

      },
      isUser: () => {
        const { user } = get();
        return user?.role === 'user';

      },
      getUserRole:()=>{
         const { user } = get();
        return user?.role || null;
      },
       isAuthenticated: () => {
        const { user, accessToken } = get();
        return !!(user && accessToken);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;