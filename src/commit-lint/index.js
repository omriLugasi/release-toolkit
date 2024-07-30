const { configService, Config } = require('./../config')
const fs = require('fs')
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)

const readFileContent = () => {
    const filePath = process.argv.slice(3)[0]
    return readFileAsync(filePath)
}

const init = async () => {
    await configService.init()

    const commitMessage = (await readFileContent()).toString()

    for (const { pattern } of configService.get(Config.COMMIT_PATTERNS_KEY)) {
        const regex = new RegExp(pattern)
        if (regex.test(commitMessage)) {
            process.exit(0)
        }
    }
    console.error(
        new Error(
            `\n Commit Message: "${commitMessage.trim()}" did not fit for any of the provided patterns: ${configService
                .get(Config.COMMIT_PATTERNS_KEY)
                .map((item) => `\n \u274c\  ${item.pattern}`)
                .join('')}`
        )
    )
    process.exit(1)
}

init().then().catch(console.error)
