let events = require('events');
let TestRail = require('./test-rail');
let titleToCaseIds = require('mocha-testrail-reporter/dist/lib/shared').titleToCaseIds;
let Status = require('mocha-testrail-reporter/dist/lib/testrail.interface').Status;

class WdioTestRailReporter extends events.EventEmitter {

    /**
     * @param {{}} baseReporter
     * @param {{testRailsOptions}} config wdio config
     */
    constructor(baseReporter, config) {
        super();
        const options = config.testRailsOptions;

        this._results = [];
        this._passes = 0;
        this._fails = 0;
        this._pending = 0;
        this._out = [];
        this.testRail = new TestRail(options);

        this.on('test:pending', (test) => {
            this._pending++;
            this._out.push(test.title + ': pending');
        });

        this.on('test:pass', (test) => {
            this._passes++;
            this._out.push(test.title + ': pass');
            let caseIds = titleToCaseIds(test.title);
            if (caseIds.length > 0) {
                let results = caseIds.map(caseId => {
                    return {
                        case_id: caseId,
                        status_id: Status.Passed,
                        comment: `${this.getRunComment(test)}`
                    };
                });
                this._results.push(...results);
            }
        });

        this.on('test:fail', (test) => {
            this._fails++;
            this._out.push(test.title + ': fail');
            let caseIds = titleToCaseIds(test.title);
            if (caseIds.length > 0) {
                let results = caseIds.map(caseId => {
                    return {
                        case_id: caseId,
                        status_id: Status.Failed,
                        comment: `${this.getRunComment(test)}
${test.err.message}
${test.err.stack}
`
                    };
                });
                this._results.push(...results);
            }
        });

        this.on('end', () => {
            if (this._results.length == 0) {
                console.warn("No testcases were matched. Ensure that your tests are declared correctly and matches TCxxx\n" +
                    "You may use script generate-cases to do it automatically.");
                return;
            }

            let executionDateTime = new Date();
            let total = this._passes + this._fails + this._pending;
            let runName = options.runName || WdioTestRailReporter.reporterName;
            let name = `${runName}: automated test run ${executionDateTime}`;
            let description = `${name}
Execution summary:
Passes: ${this._passes}
Fails: ${this._fails}
Pending: ${this._pending}
Total: ${total}
`;
            this.testRail.publish(name, description, this._results);
        });
    }

    /**
     * @param {{title}} test
     * @return {string}
     */
    getRunComment(test) {
        let comment = test.title;
        return comment;
    }
}

// webdriver requires class to have reporterName option
WdioTestRailReporter.reporterName = 'WebDriver.io test rail reporter';

module.exports = WdioTestRailReporter;