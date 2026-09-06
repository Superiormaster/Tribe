import { useState, useRef } from 'react';
import type {
NativeScrollEvent,
NativeSyntheticEvent,
} from 'react-native';

import { apiRequest } from '@/utils/api';

export type ConnectedUser = {
id: number;
username: string;
avatar?: string;
bio?: string;
connected?: boolean;
};

export function useConnectedUsers() {
const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
const [showConnections, setShowConnections] = useState(false);

const [connectedPage, setConnectedPage] = useState(1);
const [hasMoreConnections, setHasMoreConnections] = useState(true);
const [loadingConnections, setLoadingConnections] = useState(false);

const connectionsRef = useRef<any>(null);

const fetchConnectedUsers = async (page = 1) => {
if (loadingConnections) return;

try {
  setLoadingConnections(true);

  const res = await apiRequest(
    `api/users/connected/?page=${page}`
  );

  if (page === 1) {
    setConnectedUsers(res.results);
  } else {
    setConnectedUsers(prev => [
      ...prev,
      ...res.results,
    ]);
  }

  setHasMoreConnections(!!res.next);
  setConnectedPage(page);
} catch (err) {
  console.error(err);
} finally {
  setLoadingConnections(false);
}

};

const handleConnectionsScroll = (
event: NativeSyntheticEvent<NativeScrollEvent>
) => {
const {
contentOffset,
layoutMeasurement,
contentSize,
} = event.nativeEvent;

const nearBottom =
  contentOffset.y +
    layoutMeasurement.height >=
  contentSize.height - 200;

if (
  nearBottom &&
  hasMoreConnections &&
  !loadingConnections
) {
  fetchConnectedUsers(connectedPage + 1);
}

};

const openConnectionsPanel = async () => {
setConnectedUsers([]);
setConnectedPage(1);
setHasMoreConnections(true);

await fetchConnectedUsers(1);

setShowConnections(true);

};

const closeConnectionsPanel = () => {
setShowConnections(false);
};

return {
connectedUsers,
showConnections,
connectedPage,
setConnectedPage,
hasMoreConnections,
setHasMoreConnections,
loadingConnections,
connectionsRef,

setConnectedUsers,
setShowConnections,

fetchConnectedUsers,
handleConnectionsScroll,
openConnectionsPanel,
closeConnectionsPanel,

};
}