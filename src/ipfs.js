const { create } = require('ipfs-http-client')
const toolbox = require('gluegun/toolbox')

const createIpfsClient = node => {
  let url
  try {
    url = new URL(node)
  } catch (e) {
    throw new Error(`Invalid IPFS URL: ${node}

The URL must be of the following format: http(s)://host[:port]/[path]`)
  }

  // Connect to the IPFS node (if a node address was provided)
  return create(node.replace(/\/$/, '') + '/api/v0')
}

module.exports = {
  createIpfsClient,
}
