#!/bin/sh

# Abort on any error (including if wait-for-it fails).
set -e

# Wait for the backend to be up, if we know where it is.
if [ -n "$IPFS_DAEMON_HOST" ]; then
  /home/node/wait-for-it.sh $IPFS_DAEMON_HOST:${IPFS_DAEMON_PORT} -- echo "$IPFS_DAEMON_HOST:${IPFS_DAEMON_PORT} is up"
fi

# Run the main container command.
exec "$@"