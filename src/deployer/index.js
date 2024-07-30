const childProcess = require('node:child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

class Deployer {
    async exec(command) {
        return new Promise((res, rej) => {
            childProcess.exec(command, (err, stdout, stderr) => {
                if (err) {
                    rej(err)
                    return
                }
                res(stdout)
            })
        })
    }

    async makeDirectoryIfNotExists() {
        const folderPath = path.join(process.cwd(), '.github')
        if (!fs.existsSync(folderPath)) {
            // If it doesn't exist, create the directory
            fs.mkdirSync(folderPath)
        }

        const folderPathWorkflows = path.join(
            process.cwd(),
            '.github/workflows'
        )
        if (!fs.existsSync(folderPathWorkflows)) {
            // If it doesn't exist, create the directory
            fs.mkdirSync(folderPathWorkflows)
        }
    }

    async populateReleaseToolkitConfigFile(owner, repo) {
        const readAsync = promisify(fs.readFile)
        const writeAsync = promisify(fs.writeFile)

        const exampleFilePath = path.join(
            __dirname,
            '../../',
            'release-toolkit-example.json'
        )
        const releaseConfigTemplate = JSON.parse(
            await readAsync(exampleFilePath)
        )

        if (repo && owner) {
            releaseConfigTemplate.repository.owner = owner
            releaseConfigTemplate.repository.repo = repo
        }

        releaseConfigTemplate.workspaces[0].branch = 'master'
        releaseConfigTemplate.workspaces[0].plugins = [
            releaseConfigTemplate.workspaces[0].plugins[0],
            releaseConfigTemplate.workspaces[0].plugins[1],
        ]

        const targetPath = path.join(process.cwd(), 'release-toolkit.json')

        await writeAsync(
            targetPath,
            JSON.stringify(releaseConfigTemplate, null, 4)
        )
        console.log(
            `1. Create new release-toolkit configuration file on ${targetPath} path`
        )
    }

    async deployGithubAction() {
        const readAsync = promisify(fs.readFile)
        const writeAsync = promisify(fs.writeFile)

        const exampleFilePath = path.join(
            __dirname,
            '../../',
            'github-action-example.yml'
        )

        const templateContent = await readAsync(exampleFilePath, 'utf-8')
        const content = templateContent.replace(
            '<YOUR_BRANCH_NAME_HERE>',
            'master'
        )

        const targetPath = path.join(
            process.cwd(),
            '.github/workflows/release-toolkit-auto-build.yml'
        )

        // create the folders if not exists
        await this.makeDirectoryIfNotExists()

        await writeAsync(targetPath, content)
        console.log(`2. Create new github action file on ${targetPath} path`)
    }

    async deployHuskyCommitMessage() {
        const targetPath = path.join(process.cwd(), '.husky/commit-msg')
        if (fs.existsSync(targetPath)) {
            // do nothing
            return
        }

        const folderTargetPath = path.join(process.cwd(), '.husky')

        if (!fs.existsSync(folderTargetPath)) {
            // If it doesn't exist, create the directory
            fs.mkdirSync(folderTargetPath)
        }

        const content = `#!/usr/bin/env sh \n \n npx release-toolkit commit-lint $1`
        const writeAsync = promisify(fs.writeFile)
        await writeAsync(targetPath, content)
        console.log(
            `3. Create new github hook file (commit-msg) on ${targetPath} path, in order to work with the release toolkit commit lint you will need to install and init "husky"`
        )
    }

    async init() {
        const gitRemote = await this.exec('git ls-remote --get-url origin')
        let repo
        let owner
        if (gitRemote) {
            if (gitRemote.trim().startsWith('git@github')) {
                const [mOwner, mRepo] = gitRemote
                    .trim()
                    .replace('git@github.com:', '')
                    .replace('.git', '')
                    .split('/')
                owner = mOwner
                repo = mRepo
            } else {
                const [mOwner, mRepo] = gitRemote
                    .trim()
                    .replace('https://github.com/', '')
                    .replace('.git', '')
                    .split('/')
                owner = mOwner
                repo = mRepo
            }
        }

        await this.populateReleaseToolkitConfigFile(owner, repo)
        await this.deployGithubAction()
        await this.deployHuskyCommitMessage()
    }
}

exports.Deployer = Deployer
