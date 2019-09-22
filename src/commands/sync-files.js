const chalk = require('chalk')
const ipfs = require('../ipfs')
const batchPromises = require('batch-promises')

const collectUnsyncedFiles = async ({ fromClient, toClient, skipExisting }) => {
  let fromPinnedFiles = await fromClient.pin.ls()

  // If --skip-existing is provided, we obtain a list of all pinned files from
  // the target node. If not, we assume none of the source files exist on the
  // target node yet.
  if (skipExisting) {
    let toPinnedFiles = await toClient.pin.ls()
    return fromPinnedFiles.filter(
      sourceFile =>
        !toPinnedFiles.find(targetFile => sourceFile.hash === targetFile.hash),
    )
  } else {
    return fromPinnedFiles
  }
}

const HELP = `
${chalk.bold('ipfs-sync sync-files')} [options]

${chalk.dim('Options:')}
  -h, --help                    Show usage information
  --from <URL>                  Source IPFS node
  --to <URL>                    Target IPFS node
  --skip-existing               Skip files that already exist on the target IPFS node
`

module.exports = {
  description: 'Syncs files from one IPFS node to another',
  run: async toolbox => {
    let { print } = toolbox

    // Parse CLI parameters
    let { h, help, from, to, skipExisting } = toolbox.parameters.options

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

    print.info(`Syncing files`)
    print.info(`Source node (--from): ${from}`)
    print.info(`Target node (--to): ${to}`)

    let fromClient = ipfs.createIpfsClient(from)
    let toClient = ipfs.createIpfsClient(to)

    // Obtain a list of all pinned files from both nodes
    let unsyncedFiles = await collectUnsyncedFiles({
      fromClient,
      toClient,
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
        let totalFiles = unsyncedFiles.length
        let label = `${sourceFile.index}/${totalFiles} (${sourceFile.hash})`

        print.info(`${label}: Syncing`)

        // Download file
        print.info(`${label}: Retrieving file`)
        let data
        try {
          data = await fromClient.cat(sourceFile.hash)
        } catch (e) {
          if (e.message.match('dag node is a directory')) {
            print.info(`${label}: Skipping file: File is a directory`)
            syncResult.skippedDirectories.push(sourceFile.hash)
          } else {
            print.warning(`${label}: Failed to retrieve file: ${e.message}`)
            syncResult.failedFiles.push(sourceFile.hash)
          }
          return
        }

        // Upload file
        print.info(`${label}: Uploading file`)
        let targetFile
        try {
          targetFile = await toClient.add(data)
        } catch (e) {
          throw new Error(`${label}: Failed to upload file: ${e.message}`)
        }

        // Verify integrity before and after
        if (sourceFile.hash === targetFile[0].hash) {
          print.info(`${label}: File synced successfully`)
          syncResult.syncedFiles.push(sourceFile.hash)
        } else {
          throw new Error(
            `${label}: Failed to sync file: Uploaded file hash differs: ${targetFile[0].hash}`,
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
  },
}
