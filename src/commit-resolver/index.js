const axios = require('axios')
const config = require('../config')



/**
 * @description
 * Responsible on the commit analysis
 */
module.exports = () => {

    // axios.get(`https://api.github.com/repos/${config.repository.owner}/${config.repository.repo}/commits/${config.branch}`, {
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


