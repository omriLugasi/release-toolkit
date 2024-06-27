
// github module responsible on the github release, github tag, github release
const axios = require("axios");
const config = require("../../config");

/**
 * @description
 * github module responsible on the github release
 * 1. github release
 * 2. github tag
 * 3. github change log
 */

const axiosInstance = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': `Bearer ${process.env.NPM_TOKEN}`
  }
})

class Github {
  #repo
  #owner
  #branch

  constructor() {
    const { repo, owner } = config.repository.startsWith('git@') ? {
      owner: config.repository.split(':')[1].split('/')[0],
      repo: config.repository.split(':')[1].split('/')[1].replace('.git', '')
    } : {
      owner: config.repository.replace('https://github.com/', '').split('/')[0],
      repo: config.repository.replace('https://github.com/', '').split('/')[1].replace('.git', '')
    }

    // this.#repo = repo
    // this.#owner = owner


    this.#repo = 'h1-a'
    this.#owner = 'omriLugasi'
    this.#branch = config.branch
  }


  #extractCommitDate(releaseBody) {
    return releaseBody.split('<!--sparks metadata last commit date: ')[1].replace(' -->', '')
  }


  async #getLastRelease() {
    const response = await axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/releases?per_page=1&page=1`)
    return response.data
  }

  async #getCommitsByDate(since){
    const response = await axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/commits/${this.#branch}?since=${since}&until=${new Date().toISOString()}`)
    return Array.isArray(response.data) ? response.data : [response.data]
  }

  async #createTag(newTag, commitHash) {
    const tag = `${newTag}-${new Date().getTime()}`
    const createdTagResponse = await axiosInstance.post(`/repos/${this.#owner}/${this.#repo}/git/tags`, {
      tag,
      message: `Create new tag ${newTag} by release sparks`,
      tagger: {
        name: 'release sparks',
        email: 'release-sparks@gmail.com',
        date: new Date().toISOString()
      },
      type: 'commit',
      object: commitHash
    })

    await axiosInstance.post(`/repos/${this.#owner}/${this.#repo}/git/refs`, {
      ref: `refs/tags/${tag}`,
      sha: createdTagResponse.data.sha
    })
  }

  async #createRelease(newTag, commits) {
    console.log('create new release')
  }

  async release(newTag, commits) {
    const lastCommit = commits.reduce((acc, current) => {
      if (!acc) {
        return current
      }
      return new Date(acc.metadata.date).getTime() > new Date(current.metadata.date) ? acc : current
    }, null)
    await this.#createTag(newTag, lastCommit.metadata.hash)

    // TODO: need to implement creation of release
    await this.#createRelease(newTag, commits, lastCommit)
  }

  /**
   * @description
   * This function should work with github api to extract the commit messages from the last release.
   */
  async getDetails() {
    const [release] = await this.#getLastRelease()

    if (!release) {
      // TODO: if there is no release in the repository
    }
    const since = this.#extractCommitDate(release.body)
    const commits = await this.#getCommitsByDate(since)
    const results = commits.reduce((acc, { sha: currentSha, commit }) => {
        acc.push({
          message: commit.message,
          url: commit.url,
          name: commit.url.substring(commit.url.length -6 , commit.url.length),
          metadata: {
            hash: currentSha,
            date: commit.author.date
          }
        })
      return acc
    }, [])

    return { commits: results, tag: release.tag_name.split('-')[0] }
  }

}

exports.Github = Github

