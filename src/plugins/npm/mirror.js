
const { exec } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readAsync = promisify(fs.readFile)
const writeAsync = promisify(fs.writeFile)
const {NpmPublish} = require("./index");

/**
 * @description
 * workdir should contain only the following structure
 * type workdir = {
 *   pre?: string
 *   packageName: string
 *   name: string
 * }
 */
class NpmMirror {
  #workdir

  constructor(workdir) {
    this.#workdir = workdir
  }

  async changePackageJsonName(workdirPath) {
    const workdirPackageJsonPath = path.join(workdirPath, 'package.json')
    const packageJson = await readAsync(workdirPackageJsonPath, 'utf8')
    const newPackageJson = JSON.parse(packageJson)
    newPackageJson.name = this.#workdir.packageName
    await writeAsync(workdirPackageJsonPath, JSON.stringify(newPackageJson, null, 4))
  }


  async runPre(workdirPath) {
    if (!this.#workdir.pre) {
      return
    }
    return new Promise((res, rej) => {
      exec(`cd ${workdirPath} && ${this.#workdir.pre}`, (err, stdout, stderr) => {
        if (err) {
          rej(err);
          return;
        }
        res(stdout);
      })
    })
  }

  async runMirroring() {
      const workdirPath = path.join(process.cwd(), this.#workdir.folderPath)
      await this.runPre(workdirPath)
      await this.changePackageJsonName(workdirPath)
      const npmInstance = new NpmPublish(this.#workdir)
      await npmInstance.publish()
  }
}

exports.NpmMirror = NpmMirror
