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
    const auth = await getAuth({ hassUrl: window.location.origin });
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
