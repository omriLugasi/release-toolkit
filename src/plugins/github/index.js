
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

    this.#repo = repo
    this.#owner = owner
  }



  getLastRelease() {

  }


  save() {
    // axiosInstance.get(`/repos/${config.repository.owner}/${config.repository.repo}/commits/${config.branch}?page=1`, {
    //   headers: {
    //     'X-GitHub-Api-Version': '2022-11-28',
    //     'Authorization': `Bearer ${process.env.NPM_TOKEN}`
    //   }
    // })
    //   .then(response => {
    //     require('fs').writeFileSync('test.json', JSON.stringify(response.data, null, 4))
    //   })
    //   .catch(console.error)
  }
}

