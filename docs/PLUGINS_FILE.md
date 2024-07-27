
# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and single repo projects.***

## Table Of Content
- [Github](#github-plugin)
- [npm](#npm-plugin)
- [npm:mirroring](#npm-mirroring-plugin)

### Overview
All the following plugins configurations should be under the `workspace.plugins` array.

### Github Plugin
Github plugin integrate to your github account and responsible to create github tag and github release (including changelog) according to your configuration.

```json
{
  "name": "github",
  "tagPattern": "common-awesome-package-v{{tag}}",
  "releasePattern": "common-awesome-package {{release}}"
}
```



### Npm Plugin
Npm plugin integrate to your npm account and responsible to publish versions according to the response of the `git`(github) plugin

```json
{
  "name": "npm"
}
```
**Optional Properties**

| Property Name | Property Type    | #Comments    |
| :---:   | :---: | :---: |
| dryRun | boolean   | default is `false`    |


### Npm Mirroring Plugin
Npm mirroring plugin integrate to your npm account and responsible to publish the same version of other package as your package, 
this is useful when you have different veriest of the same app that act like 2 different apps by environment variable.

```json
{
  "name": "npm:mirroring",
  "packageName": "@custom/my-mirroring-package-name",
  "pre": "yarn build-same-app-with-different-context"
}
```
**Optional Properties**

| Property Name | Property Type    | #Comments    |
| :---:   | :---: | :---: |
| dryRun | boolean   | default is `false`    |