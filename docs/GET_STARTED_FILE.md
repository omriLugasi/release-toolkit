# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and multi repo projects.***


## Videos
Prefer a video, please visit our [videos page]().

### Install And Usage (3 minutes and we done!)
1. Open your terminal on the root folder, and run the following command `npx release-toolkit@latest set-config`.

2. We will add for you 3 files, `auto-build` github action, `release-toolkit.json` config file on the root folder and under `.husky` folder we will add the `commit-msg`.

3. Open the `release-toolkit.json` config file and update the `workspaces[0].folderPath` property with your folder, if you want to run the release on every change on the root you can set the `folderPath` to `'.'`.

4. Open the github page `https://github.com/<ONWER_HERE>/<REPO_NAME_HERE>/settings/secrets/actions` and add 2 secrets.
   1. `GH_TOKEN` - github token with permission on the repository to set tags and release
   2. `NPM_TOKEN` - for publishing new package version.
   
5. Push new commit `feat(): add release toolkit infrastructure`, that's it, you are ready to go 🚀🚀🚀.