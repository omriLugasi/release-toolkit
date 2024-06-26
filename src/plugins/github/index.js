
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
  }



  async #getLastRelease() {
    const response = await axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/releases?per_page=1&page=1`)
    return response.data
  }

  async #getCommitsBySha(sha /* string*/){
    const response = await axiosInstance.get(`/repos/${this.#owner}/${this.#repo}/commits?sha=${config.branch}`)
    return response.data
  }

  async getComments() {
    const [release] = await this.#getLastRelease()
    if (!release) {
      // TODO: if there is no release in the repository
    }
    const { body } = release
    // TODO: need to extract the hash of the last commit from the body
    const sha = '297f1bdbb16ec50e885e559c2ab06c9a7472a664'
    const commits = await this.#getCommitsBySha(sha)

    const results = commits.reduce((acc, { sha: currentSha, commit }) => {
      if (currentSha !== sha) {
        acc.push({
          message: commit.message,
          url: commit.url
        })
      }
      return acc
    }, [])

    return results
  }

}

exports.Github = Github

