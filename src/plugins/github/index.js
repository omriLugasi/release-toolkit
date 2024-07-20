/**
 * @description
 * github module responsible on the github release
 * 1. github release
 * 2. github tag
 * 3. github change log
 */

const axios = require("axios");
const { configService } = require("../../config");
const {modifyStringByDotNotation, GITHUB_PLUGIN_NAME} = require("../../utils");

class Github {

  static STATUS_FAILED = 'failed'
  static STATUS_SUCCESS = 'success'

  #repo
  #owner
  #workdir
  #axiosInstance

  constructor(workdir) {
    const { repo, owner } = configService.get('repository')

    this.#repo = repo
    this.#owner = owner
    this.#workdir = workdir

    this.#axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${process.env.NPM_TOKEN}`
      }
    })

  }


  #extractCommitDate(releaseBody) {
    const arr = releaseBody.split('<!--metadata:last-commit:start ')
    if (arr.length !== 2) {
      return null
    }
    return arr[1].split(' metadata:last-commit:end-->')[0]
  }

  #extractCommitId(releaseBody) {
    const arr = releaseBody.split('<!--metadata:workdir-id:start ')
    if (arr.length !== 2) {
      return null
    }
    return arr[1].split(' metadata:workdir-id:end-->')[0]
  }


  /**
   * @description
   * Find the last release that related to the workdir
   */
  async #getLastRelease({ page } = { page: 1 }) {
    const response = await this.#axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/releases?per_page=30&page=${page}`)
    if (!Array.isArray(response.data) || !response.data.length) {
      return []
    }


    for (const release of response.data) {
      const id = this.#extractCommitId(release.body)
      if (id === this.#workdir.id) {
        return [release]
      }
    }

    return this.#getLastRelease({ page: page + 1 })
  }

  async #findRelatedCommit() {
    const response = await this.#axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/commits/${this.#workdir.branch}`)

    const isRelatedToWorkdir = commit => {
      for (const file of commit.files) {
        if (file.filename.startsWith(this.#workdir.folderPath)) {
          return true
        }
      }
      return false
    }

    if (isRelatedToWorkdir(response.data)) {
      return response.data.commit.committer.date
    }

    const reviewNextCommit = async (url) => {
      const { data: commit } = await this.#axiosInstance.get(url)

        if (isRelatedToWorkdir(commit)) {
          return commit.commit.committer.date
        }

        if (Array.isArray(commit.parents) && commit.parents.length && commit.parents[0].url) {
          return reviewNextCommit(commit.parents[0].url)
        }
      }

    const commitParents = response.data.parents
    if (Array.isArray(commitParents) && commitParents.length && commitParents[0].url) {
      return reviewNextCommit(commitParents[0].url)
    }

    throw new Error(`Cannot find any commit that related to workdir=[${this.#workdir.folderPath}]`)
  }

  #isCommitDateValid(commit, since) {
    return new Date(commit.author.date).getTime() > new Date(since.trim()).getTime()
  }

  async #getCommitsByDate(since){
    const response = await this.#axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/commits/${this.#workdir.branch}`)
    let commits = []
    if (this.#isCommitDateValid(response.data.commit, since)) {
      commits.push(response.data)
      const reviewNextCommit = async (url) => {
        const { data: commit } = await this.#axiosInstance.get(url)
        if (this.#isCommitDateValid(commit.commit, since)) {
          commits.push(commit)
          if (Array.isArray(commit.parents) && commit.parents.length && commit.parents[0].url) {
            return reviewNextCommit(commit.parents[0].url)
          }
        }
      }
      const commitParents = response.data.parents
      if (Array.isArray(commitParents) && commitParents.length && commitParents[0].url) {
        await reviewNextCommit(commitParents[0].url)
      }
    }

    // filter all commits that not related to the files of the workdir.
    commits = commits.filter(commit => {
      for (const file of commit.files) {
        if (file.filename.startsWith(this.#workdir.folderPath)) {
          return true
        }
      }
      return false
    })

    return commits
  }

  async #createTag(newTag, commitHash) {
    const createdTagResponse = await this.#axiosInstance.post(`/repos/${this.#owner}/${this.#repo}/git/tags`, {
      tag: newTag,
      message: `Create new tag ${newTag} by release toolkit`,
      tagger: {
        name: 'release toolkit',
        email: 'release-toolkit@gmail.com',
        date: new Date().toISOString()
      },
      type: 'commit',
      object: commitHash
    })

    await this.#axiosInstance.post(`/repos/${this.#owner}/${this.#repo}/git/refs`, {
      ref: `refs/tags/${newTag}`,
      sha: createdTagResponse.data.sha
    })
    this.#workdir.__workdir_logger__.log({
      plugin: GITHUB_PLUGIN_NAME,
      description: `Published a new tag "${newTag}"`,
      comment: `https://github.com/${this.#owner}/${this.#repo}/tree/${newTag}`
    })
  }

  async #createChangelog(newTag, commits, lastCommit) {
    const titles = [...new Set(commits.map(commit => commit.metadata.title))]
    let message = `Release for tag ${newTag}\n`
    for (const title of titles) {
      const currentCommits = commits.filter(commit => commit.metadata.title === title)
      message += `\n## ${title}`
      for (const commit of currentCommits) {
        message += `\n- ${commit.message} ([${commit.name}](${commit.url})) by (${commit.metadata.committerName})`
      }
    }

    message += `\n\n\n<!--metadata:last-commit:start ${lastCommit.metadata.date} metadata:last-commit:end-->`
    message += `\n\n\n<!--metadata:workdir-id:start ${this.#workdir.id} metadata:workdir-id:end-->`
    return message
  }

  async #createRelease(modifiedTag, newTag, commits, lastCommit) {
    const releaseName = modifyStringByDotNotation({ release: newTag }, this.#workdir.releasePattern)

    const response = await this.#axiosInstance.post(`/repos/${this.#owner}/${this.#repo}/releases`, {
      tag_name: modifiedTag,
      target_commitish: this.#workdir.branch,
      name: releaseName,
      body: await this.#createChangelog(modifiedTag, commits, lastCommit),
      draft: false,
      prerelease: false,
      generate_release_notes: false
    })

    this.#workdir.__workdir_logger__.log({
      plugin: GITHUB_PLUGIN_NAME,
      description: `Published a new release "${releaseName}"`,
      comment: response.data.html_url
    })
    return response.data.html_url
  }

  async release(newTag, commits) {
    const lastCommit = commits.reduce((acc, current) => {
      if (!acc) {
        return current
      }
      return new Date(acc.metadata.date).getTime() > new Date(current.metadata.date) ? acc : current
    }, null)

    const modifiedTag = modifyStringByDotNotation({ tag: newTag }, this.#workdir.tagPattern)

    await this.#createTag(modifiedTag, lastCommit.metadata.hash)

    await this.#createRelease(modifiedTag, newTag, commits, lastCommit)
  }

  /**
   * @description
   * Provide the tag version and last commit date (-3 milliseconds) in the repository.
   * The -3 will provide us the option to point on this commit as a commit that trigger the flow.
   */
  async #getDetailsFromLastCommit() {
    const since = await this.#findRelatedCommit()
    return {
      since: new Date(new Date(since.trim()).getTime() - 3).toISOString(),
      tagVersion: '0.0.0'
    }
  }

  /**
   * @description
   * This function should work with github api to extract the commit messages from the last release.
   * if release not exists for this workdir we will to find the last commit by the files changes, so we will iterate on the commits.
   */
  async getDetails() {
    const [release] = await this.#getLastRelease()
    let since
    let tagVersion

    if (!release) {
      const response = await this.#getDetailsFromLastCommit()
      since = response.since
      tagVersion = response.tagVersion
    } else {
      since = this.#extractCommitDate(release.body)
      if (since === null) {
        since = release.created_at
      }
      tagVersion = release.tag_name.split('-')[0]
    }

    const commits = await this.#getCommitsByDate(since)
    const results = commits.reduce((acc, { sha: currentSha, html_url, commit }) => {
        acc.push({
          message: commit.message,
          url: html_url,
          name: html_url.substring(html_url.length -6 , html_url.length),
          metadata: {
            hash: currentSha,
            date: commit.author.date,
            committerName: commit.committer.name
          }
        })
      return acc
    }, [])
    return { commits: results, tag: tagVersion }
  }

}

exports.Github = Github

