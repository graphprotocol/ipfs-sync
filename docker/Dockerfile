FROM node:10

# Replace this with the graph-node branch you want to build the image from;
# Note: Docker Hub substitutes this automatically using our hooks/post_checkout script.
ENV SOURCE_BRANCH "master"

# Clone the ipfs-sync repository
RUN git clone https://github.com/graphprotocol/ipfs-sync \
    && cd ipfs-sync \
    && git checkout "$SOURCE_BRANCH" \
    && yarn --pure-lockfile \
    && npm install -g --verbose -unsafe-perm

ENTRYPOINT ["/usr/local/bin/ipfs-sync"]
