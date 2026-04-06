# Infrastructure Reference

## package.json

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p {{PORT}}",
    "build": "next build",
    "start": "next start",
    "lint": "eslint --fix \"src/**/*.{js,jsx,ts,tsx}\"",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@emotion/cache": "11.10.8",
    "@emotion/react": "^11.10.8",
    "@emotion/server": "11.10.0",
    "@emotion/styled": "^11.10.8",
    "@mui/icons-material": "^5.15.0",
    "@mui/lab": "5.0.0-alpha.128",
    "@mui/material": "^5.12.2",
    "@mui/system": "5.12.1",
    "@mui/x-data-grid": "6.0.3",
    "@reduxjs/toolkit": "1.9.5",
    "@tanstack/react-query": "^5.68.0",
    "axios": "^1.7.2",
    "date-fns": "2.30.0",
    "dayjs": "^1.11.9",
    "next": "^15",
    "nprogress": "0.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "7.43.9",
    "react-hot-toast": "2.4.1",
    "react-redux": "8.0.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/nprogress": "0.2.0",
    "@types/react": "^18",
    "@types/uuid": "^9.0.8",
    "@typescript-eslint/eslint-plugin": "^6",
    "@typescript-eslint/parser": "^6",
    "eslint": "^8",
    "eslint-config-next": "^15",
    "eslint-config-prettier": "^9",
    "eslint-plugin-jsx-a11y": "^6",
    "prettier": "^3",
    "typescript": "^5"
  }
}
```

**Additional deps by option:**
- If full (auth): `"@casl/ability": "6.5.0"`, `"@casl/react": "3.1.0"`, `"@hookform/resolvers": "3.1.0"`, `"yup": "1.1.1"`
- If i18n: `"i18next": "^22"`, `"react-i18next": "^12"`, `"i18next-browser-languagedetector": "^7"`
- If Socket.IO: `"socket.io-client": "^4.8.1"`
- If file upload: `"react-dropzone": "^14"`
- If date picker: `"react-datepicker": "^8"`, `"@types/react-datepicker": "^4"`
- If Excel export: `"xlsx": "^0.18"`, `"papaparse": "^5"`
- If charts: `"recharts": "^2"`, `"react-apexcharts": "^1"`

## tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "target": "es6",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "strictNullChecks": false
  },
  "include": ["src", "declaration.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: false,
  output: "standalone",
  poweredByHeader: false,
  swcMinify: true,
  images: { unoptimized: true },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    }
    if (dev) {
      config.cache = { type: 'filesystem', buildDependencies: { config: [__filename] } };
      config.watchOptions = { ignored: ['**/node_modules', '**/.next', '**/.git'] };
    }
    return config;
  },
  compiler: { styledComponents: true, removeConsole: process.env.NODE_ENV === 'production' }
};
module.exports = nextConfig;
```

## .eslintrc.json

```json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/recommended", "prettier", "plugin:jsx-a11y/recommended"],
  "rules": {
    "react/display-name": "off",
    "@next/next/no-img-element": "off",
    "react/no-unescaped-entities": "off",
    "import/no-anonymous-default-export": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "warn",
    "newline-before-return": "warn",
    "prefer-const": "warn",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn",
    "jsx-a11y/anchor-is-valid": "warn"
  }
}
```

## .env.local

```
NEXT_PUBLIC_API_URL={{API_URL}}
```

## .gitignore

```
node_modules/
.next/
out/
dist/
.env.local
.env.*.local
*.log
```

## declaration.d.ts

```typescript
declare module '*.png';
declare module '*.jpg';
declare module '*.svg';
```

---

## src/configs/api.ts — SIMPLE version (no auth)

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:{{BACKEND_PORT}}';

type OptionType = { headers: any; data: any; params?: any; responseType?: any };

axios.interceptors.response.use(
  (res) => ({ ...res, data: typeof res.data === 'string' ? JSON.parse(res.data) : res.data }),
  (error) => Promise.reject(error),
);

const headerDefault = (extraHeaders: any, data?: any) => {
  const isFormData = data instanceof FormData;
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...extraHeaders,
    Accept: 'application/json',
  };
};

const Api = {
  get: (path: string, option?: OptionType, params?: any) =>
    axios.get(`${API_URL}/${path?.replace(/^\//, '')}`, { ...option, headers: { ...headerDefault(option?.headers) }, params }),
  post: (path: string, option: OptionType) =>
    axios.post(`${API_URL}/${path.replace(/^\//, '')}`, option?.data || undefined, { ...option, headers: { ...headerDefault(option?.headers, option?.data) } }),
  put: (path: string, option: OptionType) =>
    axios.put(`${API_URL}/${path.replace(/^\//, '')}`, option?.data || undefined, { ...option, headers: { ...headerDefault(option?.headers, option?.data) } }),
  delete: (path: string, option: OptionType) =>
    axios.delete(`${API_URL}/${path.replace(/^\//, '')}`, { ...option, headers: { ...headerDefault(option?.headers) } }),
};

export default Api;
```

## src/configs/api.ts — FULL version (with auth + token refresh)

```typescript
import axios from 'axios';
import authConfig from 'src/configs/auth';
import router from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:{{BACKEND_PORT}}';

type OptionType = { headers: any; data: any; params?: any; responseType?: any };

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function redirectLogoutPage() {
  router.push({ pathname: '/login' });
  Object.keys(sessionStorage).forEach((key) => {
    if (key.toLowerCase().startsWith('filters-')) sessionStorage.removeItem(key);
  });
}

axios.interceptors.request.use((config) => config);

axios.interceptors.response.use(
  (res) => ({ ...res, data: typeof res.data === 'string' ? JSON.parse(res.data) : res.data }),
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = window.localStorage.getItem(authConfig.refreshToken);

    if (error.response?.status === 401) {
      if (!refreshToken) { redirectLogoutPage(); return Promise.reject(error); }

      const url = originalRequest.url || '';
      if (url.toLowerCase().includes('refreshtoken')) { redirectLogoutPage(); return Promise.reject(error); }

      if (!originalRequest._retry && refreshToken) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const res = await axios.post(`${API_URL}/v1/auth/refresh-token`, { refreshToken });
            if (res.data?.accessToken) {
              const { accessToken, refreshToken: newRT } = res.data;
              window.localStorage.setItem(authConfig.storageTokenKeyName, accessToken);
              if (newRT) window.localStorage.setItem(authConfig.refreshToken, newRT);
              isRefreshing = false;
              refreshSubscribers.forEach((cb) => cb(accessToken));
              refreshSubscribers = [];
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } else { isRefreshing = false; redirectLogoutPage(); return Promise.reject(error); }
          } catch { isRefreshing = false; redirectLogoutPage(); return Promise.reject(error); }
        } else {
          return new Promise((resolve, reject) => {
            refreshSubscribers.push((newToken) => {
              if (newToken) { originalRequest.headers['Authorization'] = `Bearer ${newToken}`; resolve(axios(originalRequest)); }
              else reject(error);
            });
          });
        }
      }
    }
    return Promise.reject(error);
  },
);

const headerDefault = (extraHeaders: any, data?: any) => {
  const accessToken = window.localStorage.getItem(authConfig.storageTokenKeyName);
  const isFormData = data instanceof FormData;
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...extraHeaders,
    Accept: 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
};

const Api = {
  get: (path: string, option?: OptionType, params?: any) =>
    axios.get(`${API_URL}/${path?.replace(/^\//, '')}`, { ...option, headers: { ...headerDefault(option?.headers) }, params }),
  post: (path: string, option: OptionType) =>
    axios.post(`${API_URL}/${path.replace(/^\//, '')}`, option?.data || undefined, { ...option, headers: { ...headerDefault(option?.headers, option?.data) } }),
  put: (path: string, option: OptionType) =>
    axios.put(`${API_URL}/${path.replace(/^\//, '')}`, option?.data || undefined, { ...option, headers: { ...headerDefault(option?.headers, option?.data) } }),
  delete: (path: string, option: OptionType) =>
    axios.delete(`${API_URL}/${path.replace(/^\//, '')}`, { ...option, headers: { ...headerDefault(option?.headers) } }),
};

export default Api;
```

## src/configs/auth.ts

```typescript
export default {
  storageTokenKeyName: 'accessToken',
  refreshToken: 'refreshToken',
};
```

## src/configs/themeConfig.ts

```typescript
const themeConfig = {
  mode: 'light' as const,
  templateName: '{{PROJECT_NAME}}',
  routingLoader: true,
  contentWidth: 'full' as const,
};
export default themeConfig;
```

---

## ACL System (FULL only)

### src/configs/acl.ts

```typescript
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { AclAction, AclPermission } from 'src/constants/acl';

type Subjects = string;
type AppAbility = Ability<[AclAction, Subjects]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

export type ACLObj = { action: AclAction; subject: string | string[] };

export const defaultACLObj: ACLObj = { action: AclAction.VIEW, subject: AclPermission.Home };

const defineRulesFor = (isSysAdmin: boolean, permissions: any[], role?: any) => {
  const { can, rules } = new AbilityBuilder(AppAbility);

  if (isSysAdmin) {
    can('manage' as any, 'all');
  } else {
    can(AclAction.VIEW, AclPermission.Home);
    can(AclAction.VIEW, AclPermission.PublicPages);
    if (permissions?.length) {
      permissions.forEach((p: any) => {
        if (p.view) can(AclAction.VIEW, p.name);
        if (p.create) can(AclAction.CREATE, p.name);
        if (p.edit) can(AclAction.EDIT, p.name);
        if (p.delete) can(AclAction.DELETE, p.name);
      });
    }
  }
  return rules;
};

export const buildAbilityFor = (isSysAdmin: boolean, permissions: any[], role?: any): AppAbility => {
  return new AppAbility(defineRulesFor(isSysAdmin, permissions, role), {
    detectSubjectType: (obj: any) => obj!.type,
  });
};

export default AppAbility;
```

### src/constants/acl.ts

```typescript
export enum AclAction {
  VIEW = 'view',
  EDIT = 'edit',
  CREATE = 'create',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum AclPermission {
  ALL = 'all',
  Home = 'home',
  PublicPages = 'public-pages',
  // Add module permissions here:
  // {{Entity}} = '{{entity}}',
}
```

### src/layouts/components/acl/Can.tsx

```tsx
import { createContext } from 'react';
import { createContextualCan } from '@casl/react';
import { AnyAbility } from '@casl/ability';

export const AbilityContext = createContext<AnyAbility>(undefined!);
export default createContextualCan(AbilityContext.Consumer);
```

### src/hooks/useAppAbility.tsx

```tsx
import { useAbility } from '@casl/react';
import { AbilityContext } from 'src/layouts/components/acl/Can';
export const useAppAbility = () => useAbility(AbilityContext);
```

---

## Auth Guards (FULL only)

### src/@core/components/auth/AuthGuard.tsx

```tsx
import { ReactNode, ReactElement, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'src/hooks/useAuth';
import Spinner from 'src/@core/components/spinner';

interface AuthGuardProps { children: ReactNode; fallback?: ReactElement | null }

const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const auth = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const userId = window.localStorage.getItem('userId');
    if (!userId && !auth.user) {
      if (router.asPath !== '/' && !router.asPath.includes('/logout')) {
        router.replace({ pathname: '/login', query: { returnUrl: router.asPath } });
      } else {
        router.replace('/login');
      }
    } else {
      setChecked(true);
    }
  }, [router.isReady, auth.user]);

  if (auth.loading || !checked) return fallback || <Spinner />;
  return <>{children}</>;
};

export default AuthGuard;
```

### src/@core/components/auth/GuestGuard.tsx

```tsx
import { ReactNode, ReactElement } from 'react';
import { useAuth } from 'src/hooks/useAuth';
import Spinner from 'src/@core/components/spinner';

interface GuestGuardProps { children: ReactNode; fallback?: ReactElement | null }

const GuestGuard = ({ children, fallback }: GuestGuardProps) => {
  const auth = useAuth();
  if (auth.loading) return fallback || <Spinner />;
  return <>{children}</>;
};

export default GuestGuard;
```

### src/@core/components/auth/AclGuard.tsx

```tsx
import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'src/hooks/useAuth';
import { AbilityContext } from 'src/layouts/components/acl/Can';
import { buildAbilityFor, ACLObj, defaultACLObj } from 'src/configs/acl';
import Spinner from 'src/@core/components/spinner';
import { Box, Typography, Button } from '@mui/material';

interface AclGuardProps { children: ReactNode; aclAbilities: ACLObj; authGuard?: boolean; guestGuard?: boolean }

const NotAuthorized = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <Typography variant="h1" sx={{ mb: 2 }}>401</Typography>
    <Typography variant="h5" sx={{ mb: 4 }}>Not Authorized</Typography>
    <Button href="/" variant="contained">Back to Home</Button>
  </Box>
);

const AclGuard = ({ aclAbilities, children, authGuard = true, guestGuard = false }: AclGuardProps) => {
  const auth = useAuth();
  const router = useRouter();

  if (auth.loading) return <Spinner />;
  if (guestGuard || router.route === '/404' || router.route === '/500') {
    return <AbilityContext.Provider value={buildAbilityFor(true, [])}>{children}</AbilityContext.Provider>;
  }

  const isSysAdmin = auth.user?.role?.is_system_admin || false;
  const permissions = auth.user?.role?.role_permissions || [];
  const ability = buildAbilityFor(isSysAdmin, permissions, auth.user?.role);
  const acl = aclAbilities || defaultACLObj;
  const subjects = Array.isArray(acl.subject) ? acl.subject : [acl.subject];
  const canAccess = subjects.some((s) => ability.can(acl.action, s));

  if (!canAccess && authGuard) return <NotAuthorized />;

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
};

export default AclGuard;
```

---

## Auth Context (FULL only)

### src/context/types.ts

```typescript
export type LoginParams = { email: string; password: string; rememberMe?: boolean };
export type RolePermission = { name: string; view: boolean; create: boolean; edit: boolean; delete: boolean };
export type RoleType = { name: string; type: string; id: string; is_system_admin: boolean; role_permissions: RolePermission[] };
export type UserDataType = {
  id: string; email: string; name: string; surname: string; fullName?: string;
  role: RoleType; role_id: string; profile_image?: string;
  TwoFactorAuthentication?: boolean; TwoFactorForced?: boolean;
  default_branch_id?: string;
};
```

### src/context/AuthContext.tsx

```tsx
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
import authConfig from 'src/configs/auth';
import Api from 'src/configs/api';
import { UserDataType, LoginParams, RolePermission } from 'src/context/types';

interface AuthContextType {
  user: UserDataType | null;
  loading: boolean;
  isSysAdmin: boolean;
  userRolePermissions: RolePermission[];
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, isSysAdmin: false, userRolePermissions: [],
  login: async () => {}, logout: () => {},
});

const SESSION_KEY = 'auth_session_active';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isSysAdmin = user?.role?.is_system_admin || false;
  const userRolePermissions = user?.role?.role_permissions || [];

  const fetchUser = useCallback(async () => {
    const userId = window.localStorage.getItem('userId');
    const token = window.localStorage.getItem(authConfig.storageTokenKeyName);
    const sessionActive = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionActive && token) {
      localStorage.removeItem(authConfig.storageTokenKeyName);
      localStorage.removeItem(authConfig.refreshToken);
      localStorage.removeItem('userId');
      setLoading(false); return;
    }
    if (!userId || !token) { setLoading(false); return; }
    try {
      const res = await Api.get('v1/auth/me', { data: null, headers: null });
      setUser(res.data?.data || res.data);
    } catch {
      localStorage.removeItem(authConfig.storageTokenKeyName);
      localStorage.removeItem(authConfig.refreshToken);
      localStorage.removeItem('userId');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (params: LoginParams) => {
    const res = await Api.post('v1/auth/login', { data: params, headers: null });
    const { accessToken, refreshToken, userId, user: userData } = res.data;
    window.localStorage.setItem(authConfig.storageTokenKeyName, accessToken);
    window.localStorage.setItem(authConfig.refreshToken, refreshToken);
    window.localStorage.setItem('userId', userId || userData?.id);
    window.sessionStorage.setItem(SESSION_KEY, 'true');
    setUser(userData);
    const returnUrl = router.query.returnUrl as string;
    router.replace(returnUrl || '/');
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(authConfig.storageTokenKeyName);
    window.localStorage.removeItem(authConfig.refreshToken);
    window.localStorage.removeItem('userId');
    window.sessionStorage.removeItem(SESSION_KEY);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSysAdmin, userRolePermissions, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```

### src/hooks/useAuth.tsx

```tsx
import { useContext } from 'react';
import AuthContext from 'src/context/AuthContext';
export const useAuth = () => useContext(AuthContext);
```

---

## Shared Contexts (always)

### src/context/SnackbarContext.tsx

```tsx
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertColor } from '@mui/material';
import CustomSnackbar from 'src/@core/components/customSnackbar/CustomSnackbar';

type SnackbarContextType = { showSnackbar: (message: string, severity: AlertColor) => void };
const SnackbarContext = createContext<SnackbarContextType>({ showSnackbar: () => {} });
export const useSnackbar = () => useContext(SnackbarContext);

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');

  const showSnackbar = useCallback((msg: string, sev: AlertColor) => {
    setMessage(msg); setSeverity(sev); setOpen(true);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <CustomSnackbar open={open} message={message} severity={severity} onClose={() => setOpen(false)} />
    </SnackbarContext.Provider>
  );
};
```

### src/context/BackdropContext.tsx

```tsx
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
const BackdropContext = createContext<(show: boolean) => void>(() => {});
export const useBackdrop = () => useContext(BackdropContext);

export const BackdropProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const setBackdrop = useCallback((show: boolean) => setOpen(show), []);
  return (
    <BackdropContext.Provider value={setBackdrop}>
      {children}
      <Backdrop sx={{ color: '#fff', zIndex: 9999 }} open={open}><CircularProgress color="inherit" /></Backdrop>
    </BackdropContext.Provider>
  );
};
```

---

## Redux Store

### src/store/index.ts

```typescript
import { configureStore } from '@reduxjs/toolkit';
export const store = configureStore({
  reducer: {},
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## Theme

### src/@core/theme/ThemeOptions.ts

```typescript
import { createTheme as muiCreateTheme } from '@mui/material/styles';
export const createTheme = () => muiCreateTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367F0' },
    secondary: { main: '#A8AAAE' },
    success: { main: '#28C76F' },
    error: { main: '#EA5455' },
    warning: { main: '#FF9F43' },
    info: { main: '#00CFE8' },
    background: { paper: '#FFFFFF', default: '#F8F7FA' },
    customColors: { main: '47, 43, 61' },
  },
  typography: { fontFamily: '"Public Sans", sans-serif' },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #E0E0E0' } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
  },
});

// Extend MUI palette types
declare module '@mui/material/styles' {
  interface Palette { customColors: { main: string } }
  interface PaletteOptions { customColors?: { main: string } }
}
```

### src/@core/utils/createEmotionCache.ts

```typescript
import createCache from '@emotion/cache';
const createEmotionCache = () => createCache({ key: 'css', prepend: true });
export default createEmotionCache;
```

### src/@core/hooks/useSettings.ts

```typescript
import themeConfig from 'src/configs/themeConfig';
export const useSettings = () => ({ settings: { ...themeConfig, direction: 'ltr' as const }, saveSettings: () => {} });
```

### src/@core/hooks/useBgColor.ts

```typescript
import { useTheme } from '@mui/material/styles';
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba';
export type UseBgColorType = Record<string, { color: string; backgroundColor: string }>;

const useBgColor = () => {
  const theme = useTheme();
  return {
    primaryLight: { color: theme.palette.primary.main, backgroundColor: hexToRGBA(theme.palette.primary.main, 0.16) },
    secondaryLight: { color: theme.palette.secondary.main, backgroundColor: hexToRGBA(theme.palette.secondary.main, 0.16) },
    successLight: { color: theme.palette.success.main, backgroundColor: hexToRGBA(theme.palette.success.main, 0.16) },
    errorLight: { color: theme.palette.error.main, backgroundColor: hexToRGBA(theme.palette.error.main, 0.16) },
    warningLight: { color: theme.palette.warning.main, backgroundColor: hexToRGBA(theme.palette.warning.main, 0.16) },
    infoLight: { color: theme.palette.info.main, backgroundColor: hexToRGBA(theme.palette.info.main, 0.16) },
  };
};
export default useBgColor;
```

### src/@core/utils/hex-to-rgba.ts

```typescript
export const hexToRGBA = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
```

---

## Constants

### src/constants/constant.ts

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:{{BACKEND_PORT}}';
export const ITEM_PER_PAGE = 10;
export const DATE_FORMAT = 'DD-MM-YYYY';
export const DATE_TIME_FORMAT = 'DD-MM-YYYY HH:mm';
```

### src/constants/PrivateRoutes.ts

```typescript
export const PrivateRoutes = {
  Home: '/',
};
```

---

## Pages

### src/pages/_app.tsx — SIMPLE version

```tsx
import type { AppProps } from 'next/app';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import NProgress from 'nprogress';
import Router from 'next/router';
import { store } from 'src/store';
import createEmotionCache from 'src/@core/utils/createEmotionCache';
import { createTheme } from 'src/@core/theme/ThemeOptions';
import { SnackbarProvider } from 'src/context/SnackbarContext';
import { BackdropProvider } from 'src/context/BackdropContext';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const emotionCache = createEmotionCache();
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

type ExtendedAppProps = AppProps & { emotionCache?: EmotionCache; Component: AppProps['Component'] & { getLayout?: (page: React.ReactElement) => React.ReactNode } };

const App = ({ Component, emotionCache: ec = emotionCache, pageProps }: ExtendedAppProps) => {
  const theme = createTheme();
  const getLayout = Component.getLayout ?? ((page) => page);
  return (
    <ReduxProvider store={store}>
      <CacheProvider value={ec}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>
              <BackdropProvider>
                {getLayout(<Component {...pageProps} />)}
              </BackdropProvider>
            </SnackbarProvider>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          </ThemeProvider>
        </QueryClientProvider>
      </CacheProvider>
    </ReduxProvider>
  );
};
export default App;
```

### src/pages/_app.tsx — FULL version

```tsx
import type { AppProps } from 'next/app';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import NProgress from 'nprogress';
import Router from 'next/router';
import { store } from 'src/store';
import createEmotionCache from 'src/@core/utils/createEmotionCache';
import { createTheme } from 'src/@core/theme/ThemeOptions';
import { SnackbarProvider } from 'src/context/SnackbarContext';
import { BackdropProvider } from 'src/context/BackdropContext';
import { AuthProvider } from 'src/context/AuthContext';
import AuthGuard from 'src/@core/components/auth/AuthGuard';
import GuestGuard from 'src/@core/components/auth/GuestGuard';
import AclGuard from 'src/@core/components/auth/AclGuard';
import Spinner from 'src/@core/components/spinner';
import { defaultACLObj } from 'src/configs/acl';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const emotionCache = createEmotionCache();
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

type ExtendedAppProps = AppProps & {
  emotionCache?: EmotionCache;
  Component: AppProps['Component'] & {
    getLayout?: (page: React.ReactElement) => React.ReactNode;
    authGuard?: boolean;
    guestGuard?: boolean;
    acl?: any;
  };
};

const Guard = ({ children, authGuard, guestGuard }: { children: React.ReactNode; authGuard: boolean; guestGuard: boolean }) => {
  if (guestGuard) return <GuestGuard fallback={<Spinner />}>{children}</GuestGuard>;
  if (!authGuard) return <>{children}</>;
  return <AuthGuard fallback={<Spinner />}>{children}</AuthGuard>;
};

const App = ({ Component, emotionCache: ec = emotionCache, pageProps }: ExtendedAppProps) => {
  const theme = createTheme();
  const getLayout = Component.getLayout ?? ((page) => page);
  const authGuard = Component.authGuard !== false;
  const guestGuard = Component.guestGuard || false;
  const aclAbilities = Component.acl || defaultACLObj;

  return (
    <ReduxProvider store={store}>
      <CacheProvider value={ec}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>
              <BackdropProvider>
                <AuthProvider>
                  <Guard authGuard={authGuard} guestGuard={guestGuard}>
                    <AclGuard aclAbilities={aclAbilities} authGuard={authGuard} guestGuard={guestGuard}>
                      {getLayout(<Component {...pageProps} />)}
                    </AclGuard>
                  </Guard>
                </AuthProvider>
              </BackdropProvider>
            </SnackbarProvider>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          </ThemeProvider>
        </QueryClientProvider>
      </CacheProvider>
    </ReduxProvider>
  );
};
export default App;
```

### src/pages/_document.tsx

```tsx
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import createEmotionCache from 'src/@core/utils/createEmotionCache';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const originalRenderPage = ctx.renderPage;
    const cache = createEmotionCache();
    const { extractCriticalToChunks } = createEmotionServer(cache);
    ctx.renderPage = () => originalRenderPage({
      enhanceApp: (App: any) => function EnhanceApp(props) { return <App emotionCache={cache} {...props} />; },
    });
    const initialProps = await Document.getInitialProps(ctx);
    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style key={style.key} data-emotion={`${style.key} ${style.ids.join(' ')}`} />
    ));
    return { ...initialProps, styles: [...(initialProps.styles as any), ...emotionStyleTags] };
  }
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <body><Main /><NextScript /></body>
      </Html>
    );
  }
}
export default MyDocument;
```

### src/pages/index.tsx

```tsx
const Home = () => <div>Home Page</div>;
export default Home;
```

### src/pages/404.tsx

```tsx
import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
const Error404 = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <Typography variant="h1" sx={{ mb: 2 }}>404</Typography>
    <Typography variant="h5" sx={{ mb: 4 }}>Page Not Found</Typography>
    <Button component={Link} href="/" variant="contained">Back to Home</Button>
  </Box>
);
Error404.getLayout = (page: React.ReactElement) => page;
export default Error404;
```

### src/pages/login/index.tsx (FULL only)

```tsx
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Card, CardContent, Typography, TextField, IconButton, InputAdornment } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from 'src/hooks/useAuth';
import { useSnackbar } from 'src/context/SnackbarContext';

const LoginPage = () => {
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { handleSubmit, control } = useForm({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try { await login(data); } catch (e: any) { showSnackbar(e?.response?.data?.error || 'Login failed', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 450, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h4" sx={{ mb: 1.5, textAlign: 'center' }}>Welcome</Typography>
          <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>Sign in to your account</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller name="email" control={control}
              rules={{ required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } }}
              render={({ field, fieldState: { error } }) => (
                <TextField {...field} fullWidth size="small" label="Email" error={!!error} helperText={error?.message} sx={{ mb: 3 }} />
              )} />
            <Controller name="password" control={control} rules={{ required: 'Password is required' }}
              render={({ field, fieldState: { error } }) => (
                <TextField {...field} fullWidth size="small" label="Password" type={showPw ? 'text' : 'password'} error={!!error} helperText={error?.message} sx={{ mb: 3 }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPw(!showPw)} edge="end">{showPw ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              )} />
            <LoadingButton fullWidth loading={submitting} variant="contained" type="submit" size="large">Sign In</LoadingButton>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
LoginPage.getLayout = (page: React.ReactElement) => page;
LoginPage.guestGuard = true;
LoginPage.authGuard = false;
export default LoginPage;
```
