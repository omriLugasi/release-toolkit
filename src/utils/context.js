/**
 * @description
 * We will use the context class for each workdir workflow.
 * The context will help us to share specific data between plugins.
 */
class WorkdirContext {
  static TAG_FIELD_NAME = 'tag'
  static GITHUB_STATUS_FIELD_NAME = 'github_status'

  #dbList = {}

  set(fieldName, value) {
    this.#dbList[fieldName] = value
  }

  get(fieldName) {
    return this.#dbList[fieldName]
  }

}


exports.WorkdirContext = WorkdirContext
