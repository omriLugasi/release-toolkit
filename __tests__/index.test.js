const EntryPoint = require('./../src')
const sinon = require("sinon");
const {GithubMock} = require("./utils/github");
const {ConfigMock} = require("./utils/configMock");
const assert = require('chai').assert

const basicWorkdirObject = {
    folderPath: 'src/mock',
    branch: 'master'
}

const basicGithubPlugin = {
    "name": "github",
    "tagPattern": "{{tag}}-main",
    "releasePattern": "Main - {{release}}"
}

const basicConfiguration = {
    repository: {
        repo: 'mock_repo_name',
        owner: 'mock_owner_name'
    },
    workdirs: [],
    "commitPatterns": [
        {
            "pattern": "^refactor\\(\\):",
            "upgrade": "major",
            "title": "Refeactor!"
        },
        {
            "pattern": "^feat\\(\\):",
            "upgrade": "minor",
            "title": "Features"
        },
        {
            "pattern": "^chore\\(\\):",
            "upgrade": "build",
            "title": "Chores"
        },
        {
            "pattern": "^ignore\\(\\):",
            "upgrade": "ignore"
        }
    ]
}

describe('Main', () => {

    context('No release toolkit file exists', () => {

        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance

        before(async () => {
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it ('should not failed when workdirs not supplied.', async () => {
            try {
                await instance.init()
            } catch(e) {
            }
        })

        it ('should console the right error message (error message description 1)',  () => {
            assert.strictEqual(consoleStub.args[0][0].startsWith('Release toolkit configuration file cannot be found on '), true)
        })

        it ('should console the right error message (error message description 2)',  () => {
            assert.strictEqual(consoleStub.args[1][0], 'An example for release toolkit configuration file can be found on https://github.com/omriLugasi/release-toolkit/blob/master/release-toolkit-example.json')
        })
    })

    context('No workdirs property provided', () => {

        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance

        before(async () => {
            const configMock = new ConfigMock(sandbox)
            configMock.setConfiguration(basicConfiguration)
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it ('should not failed when workdirs not supplied.', async () => {
            try {
                await instance.init()
            } catch(e) {
                assert.fail(e)
            }
        })

        it ('should console the right error message',  () => {
           assert.isTrue(consoleStub.calledWith('No workdirs found, please add "workdirs" property in your release toolkit file.'))
        })
    })

    describe('Github plugin', () => {

        context('When Github Plugin provided with simple scenario', () => {

            const sandbox = sinon.createSandbox()
            const workdir = {
                ...basicWorkdirObject,
                id: 'github_1',
                plugins: [basicGithubPlugin]
            }
            const commitMessages = [
                'chore(): an example for commit message',
                'feat(): an example for commit message',
            ]
            let githubMock
            const nowDate = new Date()
            const releaseDate = new Date(new Date(nowDate).setMinutes(nowDate.getMinutes() + 2))

            before(async () => {
                sandbox.useFakeTimers({
                    now: nowDate.getTime()
                })
                githubMock = githubMock = new GithubMock(sandbox)
                const configMock = new ConfigMock(sandbox)
                configMock.setConfiguration({
                    ...basicConfiguration,
                    workdirs: [workdir]
                })

                githubMock.setFlow({
                    lastReleaseDate: nowDate.toISOString(),
                    workdir,
                    commitMessages,
                    newReleaseDate: releaseDate.toISOString()
                })
                await new EntryPoint().init()
            })

            after(() => {
                sandbox.restore()
            })

            it('should create a new release according to the template', () => {
                assert.strictEqual(githubMock.getCreatedRelease().name, 'Main - 0.1.0')
            })

            it('should create a new release with the commits inside the message body', () => {
                const releaseBody = githubMock.getCreatedRelease().body
                commitMessages.forEach(commitMessage => {
                    assert.strictEqual(releaseBody.includes(commitMessage), true)
                })
            })

            it('should create a new release with the relevant metadata (workdir id)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:workdir-id:start ${workdir.id} metadata:workdir-id:end-->`), true)
            })


            it('should create a new release with the relevant metadata (last commit date)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`), true)
            })

            it('should create a new release with the relevant tag (according to the template)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().tag_name, `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`)
            })


        })

        context('When Github Plugin provided with a new repository scenario', () => {

            const sandbox = sinon.createSandbox()
            const workdir = {
                ...basicWorkdirObject,
                id: 'github_2',
                plugins: [basicGithubPlugin]
            }
            const commitMessages = [
                'feat(): this is the commit that we start from the releases.',
                'feat(): an example for commit message',
            ]
            let githubMock
            const nowDate = new Date()
            const releaseDate = new Date(new Date(nowDate).setMinutes(nowDate.getMinutes() + 2))

            before(async () => {
                sandbox.useFakeTimers({
                    now: nowDate.getTime()
                })
                githubMock = githubMock = new GithubMock(sandbox)
                const configMock = new ConfigMock(sandbox)
                configMock.setConfiguration({
                    ...basicConfiguration,
                    workdirs: [workdir]
                })

                githubMock.setFlow({
                    workdir,
                    commitMessages,
                    newReleaseDate: releaseDate.toISOString()
                })
                await new EntryPoint().init()
            })

            after(() => {
                sandbox.restore()
            })

            it('should create a new release according to the template', () => {
                assert.strictEqual(githubMock.getCreatedRelease().name, 'Main - 0.1.0')
            })

            it('should create a new release with the commits inside the message body', () => {
                const releaseBody = githubMock.getCreatedRelease().body
                assert.strictEqual(releaseBody.includes(commitMessages[1]), true)
            })

            it('should create a new release with the relevant metadata (workdir id)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:workdir-id:start ${workdir.id} metadata:workdir-id:end-->`), true)
            })


            it('should create a new release with the relevant metadata (last commit date)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`), true)
            })

            it('should create a new release with the relevant tag (according to the template)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().tag_name, `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`)
            })


        })

        context('When Github Plugin provided to semantic release repository scenario', () => {

            const sandbox = sinon.createSandbox()
            const workdir = {
                ...basicWorkdirObject,
                id: 'github_5',
                plugins: [basicGithubPlugin]
            }

            const commitMessages = [
                'this is a commit message that not align with the commit messages pattern',
                'feat(): an example for commit message',
            ]
            let githubMock
            const nowDate = new Date()
            const releaseDate = new Date(new Date(nowDate).setMinutes(nowDate.getMinutes() + 2))

            before(async () => {
                sandbox.useFakeTimers({
                    now: nowDate.getTime()
                })
                githubMock = githubMock = new GithubMock(sandbox)
                const configMock = new ConfigMock(sandbox)
                configMock.setConfiguration({
                    ...basicConfiguration,
                    workdirs: [workdir]
                })
                githubMock.setFlow({
                    releaseBody: 'this is the last release that not from release toolkit',
                    workdir: { id: 'id that not exists'},
                    commitMessages: [],
                    newReleaseDate: releaseDate.toISOString()
                })
                githubMock.setFlow({
                    lastReleaseDate: nowDate.toISOString(),
                    workdir,
                    commitMessages,
                    newReleaseDate: releaseDate.toISOString()
                })
                await new EntryPoint().init()
            })

            after(() => {
                sandbox.restore()
            })

            it('should create a new release according to the template', () => {
                assert.strictEqual(githubMock.getCreatedRelease().name, 'Main - 0.1.0')
            })

            it('should create a new release with the commits inside the message body', () => {
                const releaseBody = githubMock.getCreatedRelease().body
                assert.strictEqual(releaseBody.includes(commitMessages[1]), true)
            })

            it('should create a new release with the relevant metadata (workdir id)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:workdir-id:start ${workdir.id} metadata:workdir-id:end-->`), true)
            })


            it('should create a new release with the relevant metadata (last commit date)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().body.includes(`<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`), true)
            })

            it('should create a new release with the relevant tag (according to the template)', () => {
                assert.strictEqual(githubMock.getCreatedRelease().tag_name, `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`)
            })


        })

        context('When Github Plugin provided with wrong commit pattern should not trigger the release publish scenario', () => {

            const sandbox = sinon.createSandbox()
            const workdir = {
                ...basicWorkdirObject,
                id: 'github_6',
                plugins: [basicGithubPlugin]
            }
            const commitMessages = [
                'wrong(): an example for commit message',
                'wrong(): an example for commit message',
            ]
            let githubMock
            const nowDate = new Date()
            const releaseDate = new Date(new Date(nowDate).setMinutes(nowDate.getMinutes() + 2))

            before(async () => {
                sandbox.useFakeTimers({
                    now: nowDate.getTime()
                })
                githubMock = githubMock = new GithubMock(sandbox)
                const configMock = new ConfigMock(sandbox)
                configMock.setConfiguration({
                    ...basicConfiguration,
                    workdirs: [workdir]
                })

                githubMock.setFlow({
                    lastReleaseDate: nowDate.toISOString(),
                    workdir,
                    commitMessages,
                    newReleaseDate: releaseDate.toISOString()
                })
                await new EntryPoint().init()
            })

            after(() => {
                sandbox.restore()
            })

            it('should not create new release', () => {
                assert.strictEqual(githubMock.getCreatedRelease(), null)
            })


        })


    })

    describe('NPM plugin', () => {
        // when no publish needed
        // when publish pass successfuly
        // when duplication in publish
        // when dry run
        // when publish failed (504?)
    })
    describe('NPM mirroring plugin', () => {
        // when no publish needed
        // when publish pass successfuly
        // when duplication in publish
        // when dry run
        // when publish failed (504?)
    })

    describe('Combination of plugins', () => {
        // combination and validation for all plugins
    })

})
