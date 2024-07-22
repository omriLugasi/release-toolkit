const {Config} = require("../../src/config");


class ConfigMock {
    sandbox

    constructor(sandbox) {
        this.sandbox = sandbox
    }

    /**
     * @description
     * Set stub for fs readFile in order to control what is the configuration that will be used
     * in the test process.
     */
    setConfiguration(config) {
        this.sandbox.stub(Config.prototype, 'init').resolves()

        this.sandbox.stub(Config.prototype, 'get').callsFake((property) => {
            return config[property]

        })
    }
}


exports.ConfigMock = ConfigMock