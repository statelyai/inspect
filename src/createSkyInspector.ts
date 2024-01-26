import PartySocket from 'partysocket';
import { stringify } from 'superjson';
import { v4 as uuidv4 } from 'uuid';
import { createBrowserInspector } from './browser';
import {
  InspectorOptions,
  createInspector as inspectCreator,
} from './createInspector';
import { isNode } from './utils';

export function createSkyInspector(
  options: {
    apiKey?: string; // Not used yet, will be used to add additional premium features later
    onerror?: (error: Error) => void;
  } & InspectorOptions = {}
): ReturnType<typeof inspectCreator> {
  const { host, apiBaseURL } = {
    host: 'stately-sky-beta.mellson.partykit.dev', // 'localhost:1999'
    apiBaseURL: 'https://stately.ai/registry/api/sky', // 'http://localhost:3000/registry/api/sky',
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
    const { filter, serialize } = inspectorOptions;
    return createBrowserInspector({
      ...inspectorOptions,
      url: liveInspectUrl,
      serialize(event) {
        if (!filter || filter(event)) {
          const skyEvent = apiKey ? { apiKey, ...event } : event;
          socket.send(stringify(skyEvent));
        }
        return serialize ? serialize(event) : event;
      },
    });
  }
}
