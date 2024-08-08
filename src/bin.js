#!/usr/bin/env node

const cmd = process.argv[2]
switch (cmd) {
    case 'set-config':
        const { Deployer } = require('./deployer')
        return new Deployer().init()
    case 'commit-lint':
        return require('./commit-lint')
    case 'release':
    default:
        const EntryPoint = require('./index')
        new EntryPoint().init()
}
