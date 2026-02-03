import React, { createContext, useContext, useMemo, useState, useRef, useEffect } from "react";
import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig, apiRequest, authBypass } from "./authConfig";

type AuthContextShape = {
  isAuthenticated: boolean;
  account: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  acquireToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (authBypass) {
    // Simple mock auth for local development
    const ctx: AuthContextShape = {
      isAuthenticated: true,
      account: {
        homeAccountId: "dev.account",
        localAccountId: "dev",
        environment: "local",
        tenantId: "dev",
        username: "dev.user@local",
      },
      login: async () => {
        // no-op in bypass
      },
      logout: async () => {
        // no-op in bypass
      },
      acquireToken: async () => {
        return "dev-access-token";
      },
    };

    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
  }

  // Production / normal flow using MSAL
  const msalInstance = useMemo(() => new PublicClientApplication(msalConfig), []);
  const initializedRef = useRef(false);
  const interactionLockRef = useRef(false);
  const redirectProcessingRef = useRef(false);
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length ? accounts[0] : null;
  });
  const [redirecting, setRedirecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasRedirected = useRef(false);

  // handle redirect response and auto-start login if no account
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Try initialize once during mount (best-effort)
        if (!initializedRef.current && typeof msalInstance.initialize === "function") {
          try {
            await msalInstance.initialize();
            initializedRef.current = true;
            console.debug("MSAL initialized (mount)");
          } catch (initErr) {
            console.warn("MSAL initialize failed (mount):", initErr);
          }
        }

        // mark that we're processing any incoming redirect response
        redirectProcessingRef.current = true;
        const res = await msalInstance.handleRedirectPromise();
        if (!mounted) return;
        if (res && res.account) {
          setAccount(res.account);
          setRedirecting(false);
          setIsInitializing(false);
          interactionLockRef.current = false;
          redirectProcessingRef.current = false;
          return;
        }

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length) {
          setAccount(accounts[0]);
          setRedirecting(false);
          setIsInitializing(false);
          interactionLockRef.current = false;
          redirectProcessingRef.current = false;
          return;
        }

        // no account — trigger redirect once
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          setRedirecting(true);
          console.debug("No MSAL account found — redirecting to login");
          await msalInstance.loginRedirect(apiRequest);
        }
      } catch (err) {
        console.error("MSAL redirect handling error:", err);
        // clear redirecting state on error so UI doesn't get stuck
        setRedirecting(false);
        setIsInitializing(false);
        interactionLockRef.current = false;
      } finally {
        // ensure redirectProcessingRef is cleared even on error
        redirectProcessingRef.current = false;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [msalInstance]);

  const ensureInitialized = async () => {
    if (initializedRef.current) return;
    if (typeof msalInstance.initialize === "function") {
      try {
        await msalInstance.initialize();
        console.debug("MSAL initialized (ensure)");
      } catch (e) {
        console.warn("MSAL initialize failed (ensure):", e);
      }
    }
    initializedRef.current = true;
  };
  const login = React.useCallback(async () => {
    await ensureInitialized();
    // Do not trigger a new interactive flow while we are processing a redirect response
    const urlHasMsalResponse = typeof window !== 'undefined' && (
      window.location.search.includes('code=') ||
      window.location.search.includes('error=') ||
      window.location.hash.includes('id_token') ||
      window.location.hash.includes('access_token')
    );
    if (redirectProcessingRef.current || urlHasMsalResponse) {
      console.debug('Skipping loginRedirect because redirect is being processed or URL contains response');
      return;
    }
    return msalInstance.loginRedirect(apiRequest);
  }, [msalInstance]);

  const logout = React.useCallback(async () => {
    await ensureInitialized();
    return msalInstance.logoutRedirect();
  }, [msalInstance]);

  const acquireToken = React.useCallback(async () => {
    await ensureInitialized();
    // If a redirect response is being processed elsewhere, wait briefly for it to complete
    const waitForRedirectProcessing = async () => {
      const maxWait = 3000;
      const interval = 100;
      let waited = 0;
      while (redirectProcessingRef.current && waited < maxWait) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, interval));
        waited += interval;
      }
    };
    await waitForRedirectProcessing();
    // Process any incoming redirect response before attempting to acquire token
    try {
      redirectProcessingRef.current = true;
      const redirectResp = await msalInstance.handleRedirectPromise();
      if (redirectResp && redirectResp.account) {
        setAccount(redirectResp.account);
        setRedirecting(false);
        interactionLockRef.current = false;
        redirectProcessingRef.current = false;
      }
    } catch (e) {
      // ignore; we'll fall back to normal flow below
      console.debug("handleRedirectPromise in acquireToken threw:", e);
      redirectProcessingRef.current = false;
    }
    const accounts = msalInstance.getAllAccounts();
    const active = accounts.length ? accounts[0] : undefined;
    if (!active) {
      if (!interactionLockRef.current) {
        interactionLockRef.current = true;
        hasRedirected.current = true;
        setRedirecting(true);
        try {
          await msalInstance.loginRedirect(apiRequest);
        } catch (e: any) {
          if (e && e.errorCode === "interaction_in_progress") {
            console.debug("MSAL interaction already in progress");
          } else {
            console.error("MSAL loginRedirect failed:", e);
          }
        }
      } else {
        console.debug("Interactive flow already locked");
      }
      throw new Error("Redirecting to login");
    }

    try {
      const resp = await msalInstance.acquireTokenSilent({ ...apiRequest, account: active });
      setAccount(active);
      return resp.accessToken;
    } catch (e) {
      // fallback to interactive unless an interactive flow is already running
      try {
        if (!interactionLockRef.current) {
          interactionLockRef.current = true;
          hasRedirected.current = true;
          setRedirecting(true);
          await msalInstance.acquireTokenRedirect({ ...apiRequest, account: active });
        } else {
          console.debug("MSAL interaction already in progress (acquireTokenRedirect)");
        }
      } catch (err: any) {
        if (err && err.errorCode === "interaction_in_progress") {
          console.debug("MSAL interaction already in progress (acquireTokenRedirect)");
        } else {
          console.error("acquireTokenRedirect failed:", err);
        }
      }
      throw e;
    }
  }, [msalInstance]);

  const ctx = React.useMemo<AuthContextShape>(() => ({
    isAuthenticated: !!account,
    account,
    login,
    logout,
    acquireToken,
  }), [account, login, logout, acquireToken]);

  if (isInitializing || redirecting) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#fff'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #228be6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
    </MsalProvider>
  );
};

export default AuthProvider;
