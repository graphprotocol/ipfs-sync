const { build } = require('gluegun')

const run = async argv => {
  const cli = build()
    .brand('ipfs-sync')
    .src(__dirname)
    .plugins('./node_modules', { matching: 'ipfs-sync-*', hidden: true })
    .help()
    .version()
    .defaultCommand()
    .create()

  return await cli.run(argv)
}

module.exports = { run }
