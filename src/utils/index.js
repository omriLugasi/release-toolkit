class LogManager {
    table = []

    constructor(params) {
        const { folderPath, keys } = params
        this.folderPath = folderPath
        this.keys = keys
    }

    log(rowData) {
        this.table.push(rowData)
    }

    print() {
        console.log(`workspace flow summary for "${this.folderPath}"`)
        console.log({
            workspace: this.folderPath,
            summary: this.table,
        })
    }
}

exports.LogManager = LogManager

exports.GITHUB_PLUGIN_NAME = 'github'
exports.NPM_PUBLISH_PLUGIN_NAME = 'npm'
exports.NPM_MIRROR_PLUGIN_NAME = 'npm:mirroring'

// modify string with object and template
// modifyStringByDotNotation({ user: 'john snow' }, 'this is {{user}}') will return 'this is john snow'

exports.modifyStringByDotNotation = (object, str) => {
    return str.replace(/{{([^{}]+)}}/g, function (keyExpr, key) {
        return object[key]
    })
}
