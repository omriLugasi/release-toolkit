
# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and multi repo projects.***

## Table Of Content
- [Github](#github-plugin)
- [npm](#npm-plugin)
- [npm:mirroring](#npm-mirroring-plugin)

### Overview
All the following plugins configurations should be under the `workspace.plugins` array.

### Github Plugin
The GitHub plugin integrates with your GitHub account and is responsible for creating GitHub tags and releases (including changelogs) based on your configuration.

```json
{
  "name": "github",
  "tagPattern": "common-awesome-package-v{{tag}}",
  "releasePattern": "common-awesome-package {{release}}"
}
```



### Npm Plugin
The npm plugin integrates with your npm account and is responsible for publishing versions based on the output from the GitHub plugin.

```json
{
  "name": "npm"
}
```
**Optional Properties**

| Property Name | Property Type    |       Comments       |
| :---:   | :---: |:--------------------:|
| dryRun | boolean   |  default is `false`  |


### Npm Mirroring Plugin
The npm mirroring plugin integrates with your npm account and is responsible for publishing the same version of your package under the "packageName" specified.
This is useful when you have different variations of the same app with different build processes.

```json
{
  "name": "npm:mirroring",
  "packageName": "@custom/my-mirroring-package-name",
  "pre": "yarn build-same-app-with-different-context"
}
```
**Optional Properties**

| Property Name | Property Type    |       Comments       |
| :---:   | :---: |:--------------------:|
| dryRun | boolean   |  default is `false`  |