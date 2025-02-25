/**
 * The set of environment variables used by tackle2-ui.  This list
 * needs to be kept in sync with `client/config/envLookup.js`.
 */
const ENV_VAR_DEFAULTS = {
  AUTH_REQUIRED: "false",
  KEYCLOAK_REALM: "tackle",
  KEYCLOAK_CLIENT_ID: "tackle-ui",
  KEYCLOAK_SERVER_URL: "",
  UI_INGRESS_PROXY_BODY_SIZE: "",
  PROFILE: "konveyor",
  VERSION: "99.0.0",
  RWX_SUPPORTED: "true",
} as const;

type EnvVarKey = keyof typeof ENV_VAR_DEFAULTS;
const ENV_VAR_KEYS = Object.keys(ENV_VAR_DEFAULTS) as EnvVarKey[];
export type EnvVars = Record<EnvVarKey, string>;

declare global {
  interface Window {
    _env: EnvVars;
  }
}
export const ENV: EnvVars = { ...window._env } || {};

ENV_VAR_KEYS.forEach((key) => {
  if (!ENV[key]) ENV[key] = ENV_VAR_DEFAULTS[key];
});
