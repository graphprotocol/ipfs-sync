const fs = require('fs')
const chalk = require('chalk')
const ipfs = require('../ipfs')
const batchPromises = require('batch-promises');
const { CID } = require('ipfs-http-client');

const DEFAULT_RETRY_WAIT_MS = 1000;


const asyncIteratorToList = async (iterator) => {
  const values = []
  for await (const value of iterator()) {
    values.push(value)
  }
  return values
}

const collectUnsyncedFiles = async ({ fromClient, toClient, skipExisting, fileList }) => {
  let fromPinnedFiles = fileList ? fileList : await asyncIteratorToList(fromClient.pin.ls)

  // If --skip-existing is provided, we obtain a list of all pinned files from
  // the target node. If not, we assume none of the source files exist on the
  // target node yet.
  if (skipExisting) {
    let toPinnedFiles = await asyncIteratorToList(toClient.pin.ls)
    return fromPinnedFiles.filter(
      sourceFile =>
        !toPinnedFiles.find(targetFile => sourceFile.cid.equals(targetFile.cid)),
    )
  } else {
    return fromPinnedFiles
  }
}


const syncWait = (ms) => {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(ms)
    }, ms)
  })
}

const fetchData = async ({ print, fromClient, sourceFile, label, syncResult, retries, retryWait}) => {
  let file
  try {
    file = await fromClient.cat(sourceFile.cid)
  } catch (e) {
    if (retries > 0) {
      print.info(`${label}: Failed to retrieve file: Retrying...`)
      await syncWait(retryWait || DEFAULT_RETRY_WAIT_MS)
      return await fetchData({ print, fromClient, sourceFile, label, syncResult, retries: retries - 1, retryWait })
    } else {
      print.warning(`${label}: Failed to retrieve file: ${e.message}`)
      syncResult.failedFiles.push(sourceFile.cid)
      throw new Error("Max retries reached.")
    }
  }

  return file
}

const HELP = `
${chalk.bold('ipfs-sync sync-files')} [options]

${chalk.dim('Options:')}
  -h, --help                    Show usage information
  --from <URL>                  Source IPFS node
  --to <URL>                    Target IPFS node(s). It accepts a comma separated list of URLs
  --file-list <FILE>            File with one IPFS cid to sync per line
  --skip-existing               Skip files that already exist on the target IPFS node
  --retries <NUMBER>            Number of times to try to download a file from Source IPFS node
                                Set to 1 by default
  --retry-wait <MILLISECONDS>   Time to wait before attempting to download a file again
                                Set to 1000 by default
`

module.exports = {
  description: 'Syncs files from one IPFS node to another',
  run: async toolbox => {
    let { print } = toolbox

    // Parse CLI parameters
    let { h, help, from, to, skipExisting, fileList: fileListPath, retries, retryWait } = toolbox.parameters.options

    // Show help text if asked for
    if (h || help) {
      print.info(HELP)
      return
    }

    if (!from || !to) {
      print.info(HELP)
      process.exitCode = 1
      return
    }

    let targets = to.split(',')
    let fromClient = ipfs.createIpfsClient(from)

    for (const [index, target] of targets.entries()) {
      print.info(`Syncing files`)
      print.info(`Source node (--from): ${from}`)
      targets.length > 1 ?
        print.info(`Target node (--to) [${index + 1}/${targets.length}]: ${target}`) :
        print.info(`Target node (--to): ${target}`)

      let toClient = ipfs.createIpfsClient(target)

      // Read file list from the `--list` file
      fileList = fileListPath
        ? fs
            .readFileSync(fileListPath, 'utf-8')
            .trim()
            .split('\n')
            .map(cid => ({ cid: CID.parse(cid) }))
        : undefined

      // Obtain a list of all pinned files from both nodes
      let unsyncedFiles = await collectUnsyncedFiles({
        fromClient,
        toClient,
        fileList,
        skipExisting,
      })

      print.info(`${unsyncedFiles.length} files need to be synced`)
      if (unsyncedFiles.length > 0) {
        print.info(`---`)
      }

      let syncResult = {
        syncedFiles: [],
        failedFiles: [],
        skippedDirectories: [],
      }

      await batchPromises(
        // Sync in batches of 10 files
        10,
        // Inject file indices
        unsyncedFiles.map((file, index) => {
          file.index = index
          return file
        }),
        // Upload promise
        async sourceFile => {
          let cidV = 1
          if ((`${sourceFile.cid}`).startsWith('Qm')) {
            cidV = 0
          }

          let totalFiles = unsyncedFiles.length
          let label = `${sourceFile.index}/${totalFiles} (${sourceFile.cid})`

          print.info(`${label}: Syncing`)

          // Download file
          print.info(`${label}: Retrieving file`)
          let data
          try {
            data = await fetchData({print, fromClient, sourceFile, label, syncResult, retries, retryWait})
          } catch (e) {
            print.warning(`${label}: Failed to retrieve file: ${e}`)
            return
          }

          // Upload file
          print.info(`${label}: Uploading file`)

          let targetFile
          try {
            targetFile = await toClient.add(data, {cidVersion:cidV})
          } catch (e) {
            if (e.message.match('expected a file argument')) {
              print.info(`${label}: Skipping file: File is a directory`)
              syncResult.skippedDirectories.push(sourceFile.cid)
              return
            } else {
              print.error(`${label}: Failed to upload file: ${e.message}`)
              syncResult.failedFiles.push(sourceFile.cid)
              return
            }
          }

          // Verify integrity before and after
          if (sourceFile.cid.equals(targetFile.cid)) {
            print.info(`${label}: File synced successfully.`)
            syncResult.syncedFiles.push(sourceFile.cid)
          } else {
            throw new Error(
              `${label}, version: ${cidV}: Failed to sync file: Uploaded file cid differs: ${targetFile.cid}`,
            )
          }
        },
      )

      print.info(`---`)
      print.info(`${syncResult.syncedFiles.length}/${unsyncedFiles.length} files synced`)
      print.info(`${syncResult.skippedDirectories.length} skipped (directories)`)
      print.info(`${syncResult.failedFiles.length} failed`)

      if (syncResult.failedFiles.length > 0) {
        process.exitCode = 1
      }
    }
  },
}
