// addon-todoist-chore-board/web-ui/src/hass.js
import {
  getAuth,
  createConnection,
  subscribeEntities,
} from 'home-assistant-js-websocket';

const LOG_BUFFER_KEY = '__TODOIST_ADDON_DEBUG_LOGS__';

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
      // Last resort logging; avoid throwing if console is locked down.
      targetConsole?.log?.('[Todoist Add-on log error]', logErr);
    }
  }
}

let connection;

async function connectToHass() {
  if (connection) {
    emitLog('debug', 'Reusing cached Home Assistant connection');
    return connection;
  }

  try {
    // Reuse the existing Home Assistant connection when the UI is embedded via ingress.
    if (window.parent && window.parent !== window && window.parent.hassConnection) {
      try {
        connection = await window.parent.hassConnection;
        emitLog('info', 'Using parent window Home Assistant connection');
          return connection;
      } catch (parentErr) {
        emitLog('warn', 'Falling back to standalone auth flow, parent connection reuse failed', parentErr);
      }
    }

    const currentUrl = new URL(window.location.href);
    const hassUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const ingressMatch = currentUrl.pathname.match(/\/(?:api\/)?hassio_ingress\/[\w-]+/);
    const ingressPath = ingressMatch ? `${ingressMatch[0]}/` : '/';
    const clientId = `${hassUrl}${ingressPath}`;
    const redirectUrlObj = new URL(clientId);
    if (currentUrl.search) {
      // Preserve any original query parameters when performing the auth dance.
      redirectUrlObj.search = currentUrl.search;
    }
    redirectUrlObj.searchParams.set('auth_callback', '1');
    const redirectUrl = redirectUrlObj.toString();

    emitLog('debug', 'Auth parameters resolved', { hassUrl, clientId, redirectUrl });

    const auth = await getAuth({
      hassUrl,
      clientId,
      redirectUrl,
    });

    connection = await createConnection({ auth });
    emitLog('info', 'Established new Home Assistant websocket connection');
    return connection;
  } catch (err) {
    emitLog('error', 'Failed to connect to Home Assistant', err);
    throw err;
  }
}

export async function subscribeToEntities(entities, callback) {
  const conn = await connectToHass();
  return subscribeEntities(conn, callback);
}

export async function getStates() {
    const conn = await connectToHass();
    const states = await conn.getStates();
    return states;
  }

export async function callService(domain, service, serviceData) {
  const conn = await connectToHass();
  return conn.callService(domain, service, serviceData);
}
