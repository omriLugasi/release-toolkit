/**
 * @description
 * We will use the context class for each workspace workflow.
 * The context will help us to share specific data between plugins.
 */
class WorkSpaceContext {
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

exports.WorkSpaceContext = WorkSpaceContext
