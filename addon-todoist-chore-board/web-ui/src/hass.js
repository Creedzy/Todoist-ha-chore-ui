// addon-todoist-chore-board/web-ui/src/hass.js
import {
  getAuth,
  createConnection,
  subscribeEntities,
} from 'home-assistant-js-websocket';

let connection;

async function connectToHass() {
  if (connection) return connection;

  try {
    // Reuse the existing Home Assistant connection when the UI is embedded via ingress.
    if (window.parent && window.parent !== window && window.parent.hassConnection) {
      try {
        connection = await window.parent.hassConnection;
        return connection;
      } catch (parentErr) {
        console.warn('Falling back to standalone auth flow, reusing parent connection failed', parentErr);
      }
    }

    const currentUrl = new URL(window.location.href);
    const hassUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const ingressMatch = currentUrl.pathname.match(/\/api\/hassio_ingress\/[\w-]+/);
    const ingressPath = ingressMatch ? `${ingressMatch[0]}/` : '/';
    const clientId = `${hassUrl}${ingressPath}`;
    const redirectUrl = `${clientId}${currentUrl.search ?? ''}`;

    const auth = await getAuth({
      hassUrl,
      clientId,
      redirectUrl,
    });

    connection = await createConnection({ auth });
    return connection;
  } catch (err) {
    console.error('Failed to connect to Home Assistant', err);
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
