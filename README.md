# ipfs-sync

Script to sync files from one IPFS node to another.

## **DEPRECATED** This repository is deprecated now as the code was rewriten to golang and was renamed to accomodate more features related to IPFS. The new code is here [ipfs-mgm](https://github.com/graphprotocol/ipfs-mgm)

## Install

```sh
npm install -g @graphprotocol/ipfs-sync
```

## Usage

Transfer _all_ files from one IPFS node to another:

```sh
ipfs-sync sync-files --from <URL> --to <URL> [--skip-existing]
```

Transfer only specific files from one IPFS node to another:

```sh
ipfs-sync sync-files --from <URL> --to <URL> --file-list <FILE> [--skip-existing]
```

In this case, `<FILE>` has to be a file with one IPFS hash per line for each
file that should be synced from the `--from` node to the `--to` node.

## Docker usage

The Docker image is [graphprotocol/ipfs-sync](https://hub.docker.com/r/graphprotocol/ipfs-sync/).

```sh
docker run -it graphprotocol/ipfs-sync sync-files --from <URL> --to <URL> [--skip-existing]
```
