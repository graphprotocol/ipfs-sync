const ipfsHttpClient = require('ipfs-http-client')
const toolbox = require('gluegun/toolbox')

const createIpfsClient = node => {
  let url
  try {
    url = new URL(node)
  } catch (e) {
    toolbox.print.error(`\
Invalid IPFS URL: ${node}

The URL must be of the following format: http(s)://host[:port]/[path]`)
    return undefined
  }

  // Connect to the IPFS node (if a node address was provided)
  return ipfsHttpClient({
    protocol: url.protocol.replace(/[:]+$/, ''),
    host: url.hostname,
    port: url.protocol === 'https:' ? 443 : url.protocol === 'http' ? 80 : url.port,
    'api-path': url.pathname.replace(/\/$/, '') + '/api/v0/',
  })
}

module.exports = {
  createIpfsClient,
}
