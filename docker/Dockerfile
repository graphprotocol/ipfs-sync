FROM ubuntu:latest

ENV DEBIAN_FRONTEND noninteractive

# Install Node.js 10
RUN apt-get update && apt-get install -y npm
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

# Install Yarn
RUN npm install -g yarn

# Replace this with the graph-node branch you want to build the image from;
# Note: Docker Hub substitutes this automatically using our hooks/post_checkout script.
ENV SOURCE_BRANCH "master"

# Clone the ipfs-sync repository
RUN git clone https://github.com/graphprotocol/ipfs-sync \
    && cd ipfs-sync \
    && git checkout "$SOURCE_BRANCH" \
    && yarn --pure-lockfile \
    && npm install -g \
    && cd .. \
    && rm -rf ipfs-sync

ENV IPFS_FROM ""
ENV IPFS_TO ""

CMD ["sh", "-c", "ipfs-sync --from '${IPFS_FROM}' --to '${IPFS_TO}'""]
