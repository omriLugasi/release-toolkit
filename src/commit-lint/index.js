const { configService } =require('./../config')
const fs = require('fs')
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)


const readFileContent = () => {
  return readFileAsync(process.argv.slice(2)[0])
}

const init = async () => {
  const commitMessage = (await readFileContent()).toString()

  for (const { pattern } of configService.get(Config.COMMIT_PATTERNS_KEY)) {
    const regex = new RegExp(pattern)
    if (regex.test(commitMessage)) {
      process.exit(0)
    }
  }
  console.log(`
    Commit did not fit any of the provided patterns "${configService.get(Config.COMMIT_PATTERNS_KEY).map(item => item.pattern).join(' | ')}".
    
    Commit message:
      ${commitMessage}
  `)
  process.exit(1)
}


init().then().catch(console.error)
