const { exec } = require('node:child_process');
const {WorkdirContext} = require('../../utils/context')
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readAsync = promisify(fs.readFile)
const writeAsync = promisify(fs.writeFile)




/**
 * @description
 * workdir should contain only the following structure
 * type workdir = {
 *   dryRun?: boolean
 *   tag?: boolean
 *   name: string
 * }
 */
class NpmPublish {
  #workdir

  constructor(workdir) {
    this.#workdir = workdir
  }

  async changePackageJsonVersion(workdirPath) {
    const newVersion = this.#workdir.context.get(WorkdirContext.TAG_FIELD_NAME)
    const workdirPackageJsonPath = path.join(workdirPath, 'package.json')
    const packageJson = await readAsync(workdirPackageJsonPath, 'utf8')
    const newPackageJson = JSON.parse(packageJson)
    newPackageJson.version = newVersion
    await writeAsync(workdirPackageJsonPath, JSON.stringify(newPackageJson, null, 4))
  }

  /**
   * @description
   * Publish the package with the new tag.
   */
  async publish() {

    const workdirPath = path.join(process.cwd(), this.#workdir.folderPath)

    await this.changePackageJsonVersion(workdirPath)

    let command = `cd ${workdirPath} && npm publish`

    if (this.#workdir.dryRun) {
      command += ' --dry-run'
    }

    // TODO: support tag release.
    if (this.#workdir.tag === true) {
      command += ' --tag'
      throw new Error('currently not supported!')
    }

    return new Promise((res, rej) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          rej(err);
          return;
        }
        console.log(stdout)
        res(stdout);
      })
    })

    }
}


exports.NpmPublish = NpmPublish
