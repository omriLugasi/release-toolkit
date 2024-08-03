#!/usr/bin/env node

switch (process.argv[2]) {
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
