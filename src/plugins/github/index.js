/**
 * @description
 * github module responsible on the github release
 * 1. github release
 * 2. github tag
 * 3. github change log
 */

const axios = require('axios')
const axiosRetry = require('axios-retry').default
const { configService } = require('../../config')
const { modifyStringByDotNotation, GITHUB_PLUGIN_NAME } = require('../../utils')

class Github {
    static STATUS_FAILED = 'failed'
    static STATUS_SUCCESS = 'success'

    #repo
    #owner
    #workspace
    #axiosInstance

    constructor(workspace) {
        const { repo, owner } = configService.get('repository')

        this.#repo = repo
        this.#owner = owner
        this.#workspace = workspace

        this.#axiosInstance = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                'X-GitHub-Api-Version': '2022-11-28',
                Authorization: `Bearer ${process.env.GH_TOKEN}`,
            },
        })
        axiosRetry(this.#axiosInstance, { retries: 5 })
    }

    #isCommitDateValid(commit, since) {
        return (
            new Date(commit.author.date).getTime() >
            new Date(since.trim()).getTime()
        )
    }

    /**
     * @description
     * if folder path equal to "." it's mean that all the repo should be effected from this workspace.
     */
    #isFileRelatedToWorkspace(filename) {
        if (this.#workspace.folderPath === '.') {
            return true
        }
        return filename.startsWith(this.#workspace.folderPath)
    }

    /**
     * @description
     * Get commits data from the provided date.
     */
    async #getCommitsByDate(since) {
        const response = await this.#axiosInstance.get(
            `/repos/${this.#owner}/${this.#repo}/commits/${this.#workspace.branch}`
        )
        let commits = []
        if (this.#isCommitDateValid(response.data.commit, since)) {
            commits.push(response.data)
            const reviewNextCommit = async (url) => {
                const { data: commit } = await this.#axiosInstance.get(url)
                if (this.#isCommitDateValid(commit.commit, since)) {
                    commits.push(commit)
                    if (
                        Array.isArray(commit.parents) &&
                        commit.parents.length &&
                        commit.parents[0].url
                    ) {
                        return reviewNextCommit(commit.parents[0].url)
                    }
                }
            }
            const commitParents = response.data.parents
            if (
                Array.isArray(commitParents) &&
                commitParents.length &&
                commitParents[0].url
            ) {
                await reviewNextCommit(commitParents[0].url)
            }
        }

        // filter all commits that not related to the files of the workspace.
        commits = commits.filter((commit) => {
            for (const file of commit.files) {
                if (this.#isFileRelatedToWorkspace(file.filename)) {
                    return true
                }
            }
            return false
        })

        return commits
    }

    async #createTag(newTag, commitHash) {
        const createdTagResponse = await this.#axiosInstance.post(
            `/repos/${this.#owner}/${this.#repo}/git/tags`,
            {
                tag: newTag,
                message: `Create new tag ${newTag} by release toolkit`,
                tagger: {
                    name: 'release toolkit',
                    email: 'release-toolkit@gmail.com',
                    date: new Date().toISOString(),
                },
                type: 'commit',
                object: commitHash,
            }
        )

        await this.#axiosInstance.post(
            `/repos/${this.#owner}/${this.#repo}/git/refs`,
            {
                ref: `refs/tags/${newTag}`,
                sha: createdTagResponse.data.sha,
            }
        )
        this.#workspace.__workspace_logger__.log({
            plugin: GITHUB_PLUGIN_NAME,
            description: `Published a new tag "${newTag}"`,
            comment: `https://github.com/${this.#owner}/${this.#repo}/tree/${newTag}`,
        })
    }

    async #createChangelog(newTag, commits, lastCommit) {
        const titles = [
            ...new Set(commits.map((commit) => commit.metadata.title)),
        ]
        let message = `Release for tag ${newTag}\n`
        for (const title of titles) {
            const currentCommits = commits.filter(
                (commit) => commit.metadata.title === title
            )
            message += `\n## ${title}`
            for (const commit of currentCommits) {
                message += `\n- ${commit.message} ([${commit.name}](${commit.url})) by (${commit.metadata.committerName})`
            }
        }
        return message
    }

    /**
     * @description
     * Create release.
     */
    async #createRelease(modifiedTag, newTag, commits, lastCommit) {
        const releaseName = modifyStringByDotNotation(
            { release: newTag },
            this.#workspace.releasePattern
        )

        const response = await this.#axiosInstance.post(
            `/repos/${this.#owner}/${this.#repo}/releases`,
            {
                tag_name: modifiedTag,
                target_commitish: this.#workspace.branch,
                name: releaseName,
                body: await this.#createChangelog(
                    modifiedTag,
                    commits,
                    lastCommit
                ),
                draft: false,
                prerelease: false,
                generate_release_notes: false,
            }
        )

        this.#workspace.__workspace_logger__.log({
            plugin: GITHUB_PLUGIN_NAME,
            description: `Published a new release "${releaseName}"`,
            comment: response.data.html_url,
        })
        return response.data.html_url
    }

    /**
     * @description
     * Create Github Tag And Release
     */
    async release(newTag, commits) {
        const lastCommit = commits.reduce((acc, current) => {
            if (!acc) {
                return current
            }
            return new Date(acc.metadata.date).getTime() >
                new Date(current.metadata.date)
                ? acc
                : current
        }, null)

        const modifiedTag = modifyStringByDotNotation(
            { tag: newTag },
            this.#workspace.tagPattern
        )

        await this.#createTag(modifiedTag, lastCommit.metadata.hash)

        await this.#createRelease(modifiedTag, newTag, commits, lastCommit)
    }

    /**
     * @description
     * Extract the tag version from the matched tag.
     */
    #getTagVersion(tagName) {
        return tagName.match(/\d*[.]?\d[.]?\d*/)[0]
    }

    /**
     * @description
     * Get the tag that match the pattern and use it as base to get all the commits that related to this
     * release process.
     */
    async #getCommitsFromLastTag(params = { page: 1 }) {
        const response = await this.#axiosInstance.get(
            `/repos/${this.#owner}/${this.#repo}/tags?page=${params.page}&per_page=30`
        )
        const template = `^${this.#workspace.tagPattern.replace('{{tag}}', '\\d*[.]?\\d[.]?\\d*')}$`

        if (!response.data.length) {
            return {
                since: new Date(new Date().getTime() - 1000 * 60).toISOString(),
                tag: '0.0.0',
            }
        }
        for (const commit of response.data) {
            const reg = new RegExp(template)
            if (reg.test(commit.name)) {
                const { data: commitData } = await this.#axiosInstance.get(
                    commit.commit.url
                )

                return {
                    since: commitData.commit.author.date,
                    tag: this.#getTagVersion(commit.name),
                }
            }
        }
        return this.#getCommitsFromLastTag({ page: params.page + 1 })
    }

    /**
     * @description
     * The entry point to understand which version we already publish
     * This function will return the commits that related to this release process (in order to use it inside the changelog)
     * and the previous tag value in order to upgrade it according to the commits.
     */
    async getDetails() {
        const { tag, since } = await this.#getCommitsFromLastTag()

        const commits = await this.#getCommitsByDate(since)
        const results = commits.reduce(
            (acc, { sha: currentSha, html_url, commit }) => {
                acc.push({
                    message: commit.message,
                    url: html_url,
                    name: html_url.substring(
                        html_url.length - 6,
                        html_url.length
                    ),
                    metadata: {
                        hash: currentSha,
                        date: commit.author.date,
                        committerName: commit.committer.name,
                    },
                })
                return acc
            },
            []
        )
        return { commits: results, tag }
    }
}

exports.Github = Github
