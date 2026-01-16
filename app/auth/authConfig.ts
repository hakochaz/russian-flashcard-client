import type { Configuration } from "@azure/msal-browser";

const tenant = import.meta.env.VITE_AAD_TENANT_ID || "common";
const clientId = import.meta.env.VITE_AAD_CLIENT_ID || "";
const apiClientId = import.meta.env.VITE_API_CLIENT_ID || "";

const defaultRedirect = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
const configuredRedirect = import.meta.env.VITE_REDIRECT_URI || defaultRedirect;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenant}`,
    redirectUri: configuredRedirect,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const apiRequest = {
  scopes: apiClientId
    ? [`api://${apiClientId}/access_as_user`]
    : ["openid", "profile"],
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const authBypass = (import.meta.env.VITE_AUTH_BYPASS || "false") === "true" && import.meta.env.DEV;
