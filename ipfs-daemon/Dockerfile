FROM ipfs/go-ipfs as ipfs

COPY ./container_daemon /usr/local/bin/start_ipfs
RUN chmod +x /usr/local/bin/start_ipfs
# This just makes sure that:
# 1. There's an fs-repo, and initializes one if there isn't.
# 2. The API and Gateway are accessible from outside the container.
# 3. Config node.
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/start_ipfs"]
