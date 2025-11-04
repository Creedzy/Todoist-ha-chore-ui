// addon-todoist-chore-board/web-ui/src/hass.js
import {
  callService as callHassService,
  createConnection,
  createLongLivedTokenAuth,
  getAuth,
  getStates as fetchStates,
  subscribeEntities,
} from 'home-assistant-js-websocket';

const LOG_BUFFER_KEY = '__TODOIST_ADDON_DEBUG_LOGS__';
const TOKEN_STORAGE_PREFIX = '__TODOIST_ADDON_HASS_TOKENS__';
const AUTH_CALLBACK_PARAM = 'auth_callback';

if (typeof globalThis === 'object') {
  if (!Object.prototype.hasOwnProperty.call(globalThis, LOG_BUFFER_KEY)) {
    try {
      Object.defineProperty(globalThis, LOG_BUFFER_KEY, {
        value: [],
        writable: true,
        configurable: true,
      });
    } catch {
      globalThis[LOG_BUFFER_KEY] = [];
    }
  }
}

function emitLog(level, ...args) {
  const targetConsole = globalThis?.console;
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    messages: args,
  };
  const buffer = (globalThis[LOG_BUFFER_KEY] = globalThis[LOG_BUFFER_KEY] || []);
  buffer.push(payload);

  const writer = targetConsole?.[level] ?? targetConsole?.log;
  if (writer) {
    try {
      writer.call(targetConsole, '[Todoist Add-on]', ...args);
    } catch (logErr) {
      targetConsole?.log?.('[Todoist Add-on log error]', logErr);
    }
  }
}

emitLog('info', 'Todoist hass.js bundle initialised');

let cachedConnection = null;
let connectionPromise = null;
let activeAuth = null;

function getDevAuthConfig() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const envUrl = env?.VITE_HOME_ASSISTANT_URL ?? env?.VITE_HA_URL;
  const envToken = env?.VITE_HOME_ASSISTANT_TOKEN ?? env?.VITE_HA_TOKEN;

  if (envToken && !envUrl) {
    emitLog(
      'warn',
      'Ignoring provided Home Assistant token because no VITE_HOME_ASSISTANT_URL was found'
    );
  }

  if (envUrl && envToken) {
    return { hassUrl: envUrl, token: envToken, source: 'env' };
  }

  const globalDevAuth = globalThis?.TODOIST_DEV_AUTH ?? globalThis?.ADDON_DEV_AUTH;
  if (globalDevAuth?.token && globalDevAuth?.hassUrl) {
    return { ...globalDevAuth, source: 'window' };
  }

  return null;
}

function resolveTokenStorageKey(hassUrl) {
  return `${TOKEN_STORAGE_PREFIX}:${hassUrl}`;
}

function persistTokens(hassUrl, tokens) {
  if (!hassUrl) {
    return;
  }

  try {
    const key = resolveTokenStorageKey(hassUrl);
    if (!tokens) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(tokens));
  } catch (err) {
    emitLog('warn', 'Unable to persist Home Assistant auth tokens', err);
  }
}

function readTokens(hassUrl) {
  if (!hassUrl) {
    return null;
  }

  try {
    const raw = localStorage.getItem(resolveTokenStorageKey(hassUrl));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    emitLog('warn', 'Failed to read stored Home Assistant auth tokens; clearing cache', err);
    try {
      localStorage.removeItem(resolveTokenStorageKey(hassUrl));
    } catch (cleanupErr) {
      emitLog('debug', 'Failed to clear corrupted token cache', cleanupErr);
    }
    return null;
  }
}

function clearAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(AUTH_CALLBACK_PARAM)) {
      return;
    }

    url.searchParams.delete(AUTH_CALLBACK_PARAM);
    url.searchParams.delete('code');
    url.searchParams.delete('state');

    const newSearch = url.searchParams.toString();
    const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ''}${url.hash}`;
    history.replaceState(null, '', newUrl);
    emitLog('debug', 'Cleared auth_callback parameters from URL');
  } catch (err) {
    emitLog('debug', 'Failed to clear auth params from URL', err);
  }
}

function resolveAuthEndpoints() {
  const currentUrl = new URL(window.location.href);
  const hassUrl = `${currentUrl.protocol}//${currentUrl.host}`;
  const ingressMatch = currentUrl.pathname.match(/\/(?:api\/)?hassio_ingress\/[\w-]+/);
  const ingressPath = ingressMatch ? `${ingressMatch[0]}/` : '/';

  const clientUrl = new URL(ingressPath, hassUrl);
  const redirectUrl = new URL(clientUrl.toString());
  const redirectParams = new URLSearchParams(currentUrl.search);
  redirectParams.delete('code');
  redirectParams.delete('state');
  redirectParams.set(AUTH_CALLBACK_PARAM, '1');
  redirectUrl.search = redirectParams.toString();
  redirectUrl.hash = currentUrl.hash;

  return {
    hassUrl,
    clientId: clientUrl.toString(),
    redirectUrl: redirectUrl.toString(),
  };
}

async function tryInheritedConnection() {
  try {
    if (window.top === window || !window.top) {
      emitLog('debug', 'No parent frame available for hassConnection inheritance');
      return null;
    }

    const parentConnection = window.top.hassConnection;
    if (!parentConnection) {
      emitLog('debug', 'Parent frame has no hassConnection promise');
      return null;
    }

    emitLog('info', 'Attempting to reuse Home Assistant connection from parent frame');
    const resolved = await parentConnection;
    const connection = resolved?.conn ?? resolved?.connection ?? resolved;
    const auth = resolved?.auth ?? connection?.options?.auth ?? null;

    if (!connection) {
      emitLog('warn', 'Parent hassConnection resolved without a usable connection payload', resolved);
      return null;
    }

    return { connection, auth };
  } catch (err) {
    emitLog('warn', 'Failed to inherit hassConnection from parent frame', err);
    return null;
  }
}

async function createProvidedTokenAuth(hassUrl) {
  const devAuth = getDevAuthConfig();
  if (!devAuth) {
    return null;
  }

  const resolvedUrl = devAuth.hassUrl ?? hassUrl;
  emitLog('info', `Using provided long-lived access token (${devAuth.source}) for Home Assistant connection`);
  const auth = await createLongLivedTokenAuth(resolvedUrl, devAuth.token);
  return auth;
}

async function createStandaloneConnection() {
  const endpoints = resolveAuthEndpoints();

  const providedAuth = await createProvidedTokenAuth(endpoints.hassUrl).catch((err) => {
    emitLog('error', 'Failed to authenticate using provided long-lived token', err);
    throw err;
  });

  if (providedAuth) {
    const connection = await createConnection({ auth: providedAuth });
    return { connection, auth: providedAuth };
  }

  let auth;
  const options = {
    hassUrl: endpoints.hassUrl,
    clientId: endpoints.clientId,
    redirectUrl: endpoints.redirectUrl,
    saveTokens: (tokens) => persistTokens(tokens?.hassUrl ?? endpoints.hassUrl, tokens),
    loadTokens: () => Promise.resolve(readTokens(endpoints.hassUrl)),
  };

  try {
    auth = await getAuth(options);
    emitLog('info', 'Obtained Home Assistant auth via standalone flow', {
      hassUrl: endpoints.hassUrl,
      clientId: endpoints.clientId,
    });
  } catch (err) {
    if (typeof err === 'object' && err !== null && err.error === 'invalid_grant') {
      emitLog('warn', 'Received invalid_grant from Home Assistant; clearing stored tokens and retrying');
      persistTokens(endpoints.hassUrl, null);
      return createStandaloneConnection();
    }

    emitLog('error', 'Failed to obtain Home Assistant auth via standalone flow', err);
    throw err;
  }

  clearAuthParamsFromUrl();
  const connection = await createConnection({ auth });
  return { connection, auth };
}

async function establishConnection() {
  const inherited = await tryInheritedConnection();
  if (inherited) {
    emitLog('info', 'Reusing Home Assistant connection inherited from parent frame');
    return inherited;
  }

  emitLog('info', 'Falling back to standalone Home Assistant auth flow');
  return createStandaloneConnection();
}

async function getConnection() {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!connectionPromise) {
    connectionPromise = establishConnection()
      .then(({ connection, auth }) => {
        cachedConnection = connection;
        activeAuth = auth ?? connection?.options?.auth ?? null;

        if (!window.hassConnection) {
          window.hassConnection = Promise.resolve({ conn: connection, auth: activeAuth });
        }

        return connection;
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }

  return connectionPromise;
}

export async function subscribeToEntities(callback) {
  const conn = await getConnection();
  return subscribeEntities(conn, callback);
}

export async function getStates() {
  const conn = await getConnection();
  const statesArray = await fetchStates(conn);
  return Array.isArray(statesArray)
    ? statesArray.reduce((acc, entity) => {
        acc[entity.entity_id] = entity;
        return acc;
      }, {})
    : statesArray || {};
}

export async function callService(domain, service, serviceData) {
  const conn = await getConnection();
  return callHassService(conn, domain, service, serviceData);
}

export function getActiveAuth() {
  return activeAuth;
}
