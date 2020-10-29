const ipfs = require('./ipfs')
const batchPromises = require('batch-promises')

const collectUnsyncedFiles = async ({ fromClient, toClient, skipExisting, fileList }) => {
  let fromPinnedFiles = fileList ? fileList : await fromClient.pin.ls()

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

module.exports = async props => {

    // Parse CLI parameters
    let { from, to, skipExisting, fileList } = props

    if (!from || !to) {
      return
    }

  console.info(`Syncing files`)
  console.info(`Source node (--from): ${from}`)
  console.info(`Target node (--to): ${to}`)

    let fromClient = ipfs.createIpfsClient(from)
    let toClient = ipfs.createIpfsClient(to)

    // Obtain a list of all pinned files from both nodes
    let unsyncedFiles = await collectUnsyncedFiles({
      fromClient,
      toClient,
      fileList,
      skipExisting,
    })

  console.info(`${unsyncedFiles.length} files need to be synced`)

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

        console.info(`${label}: Syncing`)

        // Download file
        console.info(`${label}: Retrieving file`)
        let data
        try {
          data = await fromClient.cat(sourceFile.hash)
        } catch (e) {
          if (e.message.match('dag node is a directory')) {
            console.info(`${label}: Skipping file: File is a directory`)
            syncResult.skippedDirectories.push(sourceFile.hash)
          } else {
            console.warn(`${label}: Failed to retrieve file: ${e.message}`)
            syncResult.failedFiles.push(sourceFile.hash)
          }
          return
        }

        // Upload file
        console.info(`${label}: Uploading file`)
        let targetFile
        try {
          targetFile = await toClient.add(data)
        } catch (e) {
          throw new Error(`${label}: Failed to upload file: ${e.message}`)
        }

        // Verify integrity before and after
        if (sourceFile.hash === targetFile[0].hash) {
          console.info(`${label}: File synced successfully`)
          syncResult.syncedFiles.push(sourceFile.hash)
        } else {
          throw new Error(
            `${label}: Failed to sync file: Uploaded file hash differs: ${targetFile[0].hash}`,
          )
        }
      },
    )

    console.info(`---`)
    console.info(`${syncResult.syncedFiles.length}/${unsyncedFiles.length} files synced`)
    console.info(`${syncResult.skippedDirectories.length} skipped (directories)`)
    console.info(`${syncResult.failedFiles.length} failed`)

    return syncResult;
}
