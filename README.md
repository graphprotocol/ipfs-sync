# ipfs-sync

Script to sync files from one IPFS node to another.

## Install

```sh
npm install -g @graphprotocol/ipfs-sync
```

## Usage

```sh
ipfs-sync sync-files --from <URL> --to <URL> [--skip-existing]
```

## Docker usage

The Docker image is [graphprotocol/ipfs-sync](https://hub.docker.com/r/graphprotocol/ipfs-sync/).

```sh
docker run -it graphprotocol/ipfs-sync sync-files --from <URL> --to <URL> [--skip-existing]
```
