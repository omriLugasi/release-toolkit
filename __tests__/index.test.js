const EntryPoint = require('./../src')
const sinon = require('sinon')
const fs = require('fs')
const axios = require('axios')
const { Config } = require('../src/config')
const { LogManager } = require('../src/utils')
const child_process = require('node:child_process')
const assert = require('chai').assert

const utils = {
    isGetTagsUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/tags?`),
    isPostTagsUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/git/tags`),
    isPostTagsRefUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/git/refs`),
    isCommitsUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/commits`),
    isPostReleasesUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/releases`),
    generateWorkspaces: ({ additionalPlugins = [] } = {}) => [
        {
            branch: 'master',
            folderPath: '/src/mock',
            plugins: [
                {
                    name: 'github',
                    tagPattern: '{{tag}}',
                    releasePattern: '{{release}}',
                },
                ...additionalPlugins,
            ],
        },
    ],
    generateCommitResponse: ({ commit, parents }) => ({
        sha: '53df6d85a3f9015ef416f968331d33dbeeab135d',
        commit: {
            author: {
                name: 'omri',
                email: 'release-toolkit@gmail.com',
                date: commit.date?.toISOString() || '2024-07-02T19:08:58Z',
            },
            committer: {
                name: 'omri',
                email: 'release-toolkit@gmail.com',
                date: commit.date?.toISOString() || '2024-07-02T19:08:58Z',
            },
            message: commit.message,
            tree: {
                sha: 'a93fd60b532245376973b9bea2bf29d1fa78c5e2',
                url: 'https://api.github.com/repos/omriLugasi/h1-a/git/trees/a93fd60b532245376973b9bea2bf29d1fa78c5e2',
            },
            url: 'https://api.github.com/repos/omriLugasi/h1-a/git/commits/53df6d85a3f9015ef416f968331d33dbeeab135d',
            comment_count: 0,
            verification: {
                verified: false,
                reason: 'unsigned',
                signature: null,
                payload: null,
            },
        },
        url: 'https://api.github.com/repos/omriLugasi/h1-a/commits/53df6d85a3f9015ef416f968331d33dbeeab135d',
        html_url:
            'https://github.com/omriLugasi/h1-a/commit/53df6d85a3f9015ef416f968331d33dbeeab135d',
        parents: parents || [],
        files: [{ filename: commit.file }],
    }),
}

describe.only('Main', () => {
    context('No release toolkit file exists', () => {
        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance

        before(async () => {
            sandbox.stub(fs, 'readFile').callsFake((path, encode, callback) => {
                callback(new Error('this is a custom error'))
            })
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it('should not failed when workspaces not supplied.', async () => {
            try {
                await instance.init()
            } catch (e) {}
        })

        it('should console the right error message (error message description 1)', () => {
            assert.strictEqual(
                consoleStub.args[0][0].startsWith(
                    'Release toolkit configuration file cannot be found on '
                ),
                true
            )
        })

        it('should console the right error message (error message description 2)', () => {
            assert.strictEqual(
                consoleStub.args[1][0],
                'An example for release toolkit configuration file can be found on https://github.com/omriLugasi/release-toolkit/blob/master/release-toolkit-example.json'
            )
        })
    })

    context('No workspaces property provided', () => {
        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance
        const config = {
            repository: {
                owner: 'owner',
                repo: 'repo',
            },
            workspaces: [],
            commitPatterns: [
                {
                    pattern: '^refactor\\(\\):',
                    upgrade: 'minor',
                    title: 'Refactor!',
                },
            ],
        }

        before(async () => {
            sandbox.stub(Config.prototype, 'init').resolves()

            sandbox.stub(Config.prototype, 'get').callsFake((property) => {
                return config[property]
            })
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it('should not failed when workspaces not supplied.', async () => {
            try {
                await instance.init()
            } catch (e) {
                assert.fail(e)
            }
        })

        it('should console the right error message', () => {
            assert.isTrue(
                consoleStub.calledWith(
                    'No workspaces found, please add "workspaces" property in your release toolkit file.'
                )
            )
        })
    })

    context('Github plugin', () => {
        context(
            'When Github Plugin provided - no commits found that related to the pattern',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                    commitPatterns: [
                        {
                            pattern: '^refactor\\(\\):',
                            upgrade: 'minor',
                            title: 'Refactor!',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'message that is not in the right format.',
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                            date: new Date(
                                                new Date().getTime() - 1000
                                            ),
                                        },
                                    }),
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub once', () => {
                    assert.strictEqual(logManagerStub.calledOnce, true)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - tag not found and related commits exists',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                    commitPatterns: [
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'minor',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'chore(): commit message with the right pattern',
                                            date: new Date(
                                                new Date().getTime() - 3000
                                            ),
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                        },
                                    }),
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub twice', () => {
                    assert.strictEqual(logManagerStub.callCount, 2)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: `https://github.com/${config.repository.owner}/${config.repository.repo}/tree/0.1.0`,
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - tag exists and related new commits with the relevant pattern not exists',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                    commitPatterns: [
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'minor',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'commit that not match the patterns',
                                            date: new Date(
                                                new Date().getTime() - 3000
                                            ),
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                        },
                                    }),
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub once', () => {
                    assert.strictEqual(logManagerStub.callCount, 1)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - tag exists and there are commits that not related to the provided workspace folder path',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                    commitPatterns: [
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'minor',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'chore(): this is a custom commit message',
                                            date: new Date(
                                                new Date().getTime() - 3000
                                            ),
                                            file: 'path-that-not-match-provided-folder-path',
                                        },
                                    }),
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub once', () => {
                    assert.strictEqual(logManagerStub.callCount, 1)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - tag exists and multiple commits ',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                            parents: [{ url }],
                                        }),
                                    }
                                }
                                // return the second new commit
                                else if (requestCommitsIndex === 2) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub twice', () => {
                    assert.strictEqual(logManagerStub.callCount, 2)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the new release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new release "0.1.0"',
                            comment: undefined,
                        }),
                        true
                    )
                })
            }
        )
    })

    context('NPM plugin', () => {
        context(
            'When Github and NPM Plugins provided - no commits found that related to the pattern',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm',
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^refactor\\(\\):',
                            upgrade: 'minor',
                            title: 'Refactor!',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'message that is not in the right format.',
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                            date: new Date(
                                                new Date().getTime() + 1000
                                            ),
                                        },
                                    }),
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub twice', () => {
                    assert.strictEqual(logManagerStub.callCount, 2)
                })

                it('should log that github plugin not invoke the publish action', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })

                it('should log that npm plugin not invoke the publish action', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm',
                            description: 'No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM publish should be invoke and pass successfully',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm',
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the new release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new release "0.1.0"',
                            comment: undefined,
                        }),
                        true
                    )
                })

                it('should invoke the log with the new npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm',
                            description:
                                'publish successfully a new version (0.1.0)',
                            comment: '',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM publish should be invoke and pass successfully (dry run)',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm',
                                dryRun: true,
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the new release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new release "0.1.0"',
                            comment: undefined,
                        }),
                        true
                    )
                })

                it('should invoke the log with the new npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm',
                            description:
                                'publish successfully a new version (0.1.0)',
                            comment: 'DRY RUN',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM publish should be invoke and failed',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm',
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                const customError = new Error('this is a custom error')
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(customError)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the git release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm',
                            description: 'publish failed for (0.1.0)',
                            comment: 'Error: this is a custom error',
                        }),
                        true
                    )
                })

                it('should invoke the log with the failed npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm',
                            description: 'publish failed for (0.1.0)',
                            comment: `Error: ${customError.message}`,
                        }),
                        true
                    )
                })
            }
        )
    })

    context('NPM Mirror plugin', () => {
        context(
            'When Github and NPM Plugins provided - no commits found that related to the pattern',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm:mirroring',
                                packageName:
                                    '@custom/my-mirroring-package-name',
                                pre: 'yarn build-same-app-with-different-context',
                                dryRun: true,
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^refactor\\(\\):',
                            upgrade: 'minor',
                            title: 'Refactor!',
                        },
                    ],
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'message that is not in the right format.',
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                            date: new Date(
                                                new Date().getTime() + 1000
                                            ),
                                        },
                                    }),
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub twice', () => {
                    assert.strictEqual(logManagerStub.callCount, 2)
                })

                it('should log that github plugin not invoke the publish action', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })

                it('should log that npm plugin not invoke the publish action', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm:mirroring',
                            description: 'No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM Mirror publish should be invoke and pass successfully',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm:mirroring',
                                packageName:
                                    '@custom/my-mirroring-package-name',
                                pre: 'yarn build-same-app-with-different-context',
                                dryRun: true,
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the new release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new release "0.1.0"',
                            comment: undefined,
                        }),
                        true
                    )
                })

                it('should invoke the log with the new npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm:mirroring',
                            description:
                                'publish successfully a new version (0.1.0)',
                            comment: 'DRY RUN',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM Mirror publish should be invoke and pass successfully (dry run)',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm:mirroring',
                                packageName:
                                    '@custom/my-mirroring-package-name',
                                pre: 'yarn build-same-app-with-different-context',
                                dryRun: true,
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the new release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new release "0.1.0"',
                            comment: undefined,
                        }),
                        true
                    )
                })

                it('should invoke the log with the new npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm:mirroring',
                            description:
                                'publish successfully a new version (0.1.0)',
                            comment: 'DRY RUN',
                        }),
                        true
                    )
                })
            }
        )

        context(
            'When Github Plugin provided - new NPM Mirror publish should be invoke and failed',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces({
                        additionalPlugins: [
                            {
                                name: 'npm:mirroring',
                                packageName:
                                    '@custom/my-mirroring-package-name',
                                pre: 'yarn build-same-app-with-different-context',
                                dryRun: true,
                            },
                        ],
                    }),
                    commitPatterns: [
                        {
                            pattern: '^feat\\(\\):',
                            upgrade: 'minor',
                            title: 'Features',
                        },
                        {
                            pattern: '^chore\\(\\):',
                            upgrade: 'build',
                            title: 'Chores',
                        },
                    ],
                }
                let logManagerStub
                let requestCommitsIndex = 0
                const customError = new Error('this is a custom error')
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(customError)
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: [
                                        {
                                            name: config.workspaces[0].plugins[0].tagPattern.replace(
                                                '{{tag}}',
                                                '0.0.1'
                                            ),
                                            commit: {
                                                url: `/repos/${config.repository.owner}/${config.repository.repo}/commits/sha-string`,
                                            },
                                        },
                                    ],
                                }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                // return the commit of the latest tag
                                if (requestCommitsIndex === 0) {
                                    requestCommitsIndex += 1
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'chore(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime()
                                                ),
                                                file: 'path-that-not-match-provided-folder-path',
                                            },
                                        }),
                                    }
                                }
                                // return the first new commit
                                else if (requestCommitsIndex === 1) {
                                    return {
                                        data: utils.generateCommitResponse({
                                            commit: {
                                                message:
                                                    'feat(): this is a custom commit message',
                                                date: new Date(
                                                    new Date().getTime() + 3000
                                                ),
                                                file: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        }),
                                    }
                                }
                            }
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'post')
                        .callsFake((url) => {
                            if (
                                utils.isPostTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: { sha: 'this-is-a-sha-string' } }
                            } else if (
                                utils.isPostTagsRefUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: {} }
                            } else if (
                                utils.isPostReleasesUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: {
                                        sha: {
                                            html_url:
                                                'this-is-an-html-url-string',
                                        },
                                    },
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub 3 times', () => {
                    assert.strictEqual(logManagerStub.callCount, 3)
                })

                it('should invoke the log with the new tag details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'Published a new tag "0.1.0"',
                            comment: 'https://github.com/owner/repo/tree/0.1.0',
                        }),
                        true
                    )
                })

                it('should invoke the log with the git release details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm:mirroring',
                            description: 'publish failed for (0.1.0)',
                            comment: 'Error: this is a custom error',
                        }),
                        true
                    )
                })

                it('should invoke the log with the failed npm publish details', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'npm:mirroring',
                            description: 'publish failed for (0.1.0)',
                            comment: `Error: ${customError.message}`,
                        }),
                        true
                    )
                })
            }
        )
    })
})
