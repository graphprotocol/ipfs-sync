const ipfsHttpClient = require('ipfs-http-client')

const createIpfsClient = node => {
  let url
  try {
    url = new URL(node)
  } catch (e) {
    throw new Error(`Invalid IPFS URL: ${node}

The URL must be of the following format: http(s)://host[:port]/[path]`)
  }

  // Set the port to 443 or 80 explicitly, if no port was provided
  let port = url.port
    ? url.port
    : url.protocol === 'https:'
    ? 443
    : url.protocol === 'http'
    ? 80
    : undefined

  // Connect to the IPFS node (if a node address was provided)
  return ipfsHttpClient({
    protocol: url.protocol.replace(/[:]+$/, ''),
    host: url.hostname,
    port: port,
    'api-path': url.pathname.replace(/\/$/, '') + '/api/v0/',
  })
}

module.exports = {
  createIpfsClient,
}
