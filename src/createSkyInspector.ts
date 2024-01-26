import PartySocket from 'partysocket';
import { stringify } from 'superjson';
import { v4 as uuidv4 } from 'uuid';
import { createBrowserInspector } from './browser';
import {
  InspectorOptions,
  createInspector as inspectCreator,
} from './createInspector';
import { isNode } from './utils';

// Not the most elegant way to do this, but it makes it much easier to test local changes
const isDevMode = false;

export function createSkyInspector(
  options: {
    apiKey?: string; // Not used yet, will be used to add additional features later
    onerror?: (error: Error) => void;
  } & InspectorOptions = {}
): ReturnType<typeof inspectCreator> {
  const { host, apiBaseURL } = {
    host: isDevMode
      ? 'localhost:1999'
      : 'stately-sky-beta.mellson.partykit.dev',
    apiBaseURL: isDevMode
      ? 'http://localhost:3000/registry/api/sky'
      : 'https://stately.ai/registry/api/sky',
  };
  const server = apiBaseURL.replace('/api/sky', '');
  const { apiKey, onerror, ...inspectorOptions } = options;
  const sessionId = uuidv4(); // Generate a unique session ID
  const room = `inspect-${sessionId}`;
  const socket = new PartySocket({
    host,
    room,
    WebSocket: isNode ? require('isomorphic-ws') : undefined,
  });
  const liveInspectUrl = `${server}/inspect/${sessionId}`;
  socket.onerror = onerror ?? console.error;
  socket.onopen = () => {
    console.log('Connected to Sky, link to your live inspect session:');
    console.log(liveInspectUrl);
  };
  if (isNode) {
    return inspectCreator({
      ...inspectorOptions,
      send(event) {
        const skyEvent = apiKey ? { apiKey, ...event } : event;
        socket.send(stringify(skyEvent));
      },
    });
  } else {
    return createBrowserInspector({
      ...inspectorOptions,
      url: liveInspectUrl,
      send(event) {
        const skyEvent = apiKey ? { apiKey, ...event } : event;
        socket.send(stringify(skyEvent));
      },
    });
  }
}
