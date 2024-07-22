
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)

class Config {

    static WORKDIRS_KEY = 'workdirs'
    static COMMIT_PATTERNS_KEY = 'commitPatterns'
    static REPOSITORY_KEY = 'repository'

    async init() {
        const configFilePath = path.join(process.cwd(), 'release-toolkit.json')
        try {
            const config = await readFileAsync(configFilePath)
            this.configuration = JSON.parse(config)
        } catch (e) {
            console.error(`Release toolkit configuration file cannot be found on ${configFilePath}, please set the configuration file.`)
            console.error(`An example for release toolkit configuration file can be found on https://github.com/omriLugasi/release-toolkit/blob/master/release-toolkit-example.json`)

            throw e
        }
    }

    get(propertyName) {
        return this.configuration[propertyName]
    }

}

exports.Config = Config
exports.configService = new Config()

