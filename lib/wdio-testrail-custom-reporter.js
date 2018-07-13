let events = require('events');
let TestRail = require('./test-rail');
let titleToCaseIds = require('mocha-testrail-reporter/dist/lib/shared').titleToCaseIds;
let Status = require('mocha-testrail-reporter/dist/lib/testrail.interface').Status;
let case_ids = [];

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
        this.failureScreenshots = {};
        this.errorshotHost = (config.errorshotHost || options.errorshotHost || null)
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
                case_ids.push(...caseIds);
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
            const capability = test.runner[test.cid];
            const runnerInfo = baseReporter.stats.runners[test.cid];

            this._fails++;
            this._out.push(test.title + ': fail');
            let caseIds = titleToCaseIds(test.title);
            if (caseIds.length > 0) {
                case_ids.push(...caseIds);
                let results = caseIds.map(caseId => {
                    return {
                        case_id: caseId,
                        status_id: Status.Failed,
                        comment: `${this.getRunComment(test)}

**${test.err.message}**

> ${test.err.stack}

----

_Additional Test Context_

**Session Id/Saucelabs Link:**
> ${this.getSessionIdOrJobLink(runnerInfo)}

**Browser Info:**
> ${this.getBrowserCombo(capability)}

**Screenshot:**
> ${this.getErrorShotComment(this.failureScreenshots[test.uid])}
`
                    };
                });
                this._results.push(...results);
            }
        });

        this.on('runner:screenshot', (screenshot) => {
           try {
            if(this.errorshotHost){
                screenshot.url =  `${this.errorshotHost}/${screenshot.filename}`;
            }
            this.failureScreenshots[screenshot.uid] = screenshot;
           } catch (error) {
               return;
           }
        })

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
**Execution summary:**
Passes: ${this._passes}
Fails: ${this._fails}
Pending: ${this._pending}
Total: ${total}
`;
            this.testRail.publish(name, description, this._results, case_ids);
        });
    }

    /**
     * @param {{filename,url}} screenshot
     * @return {string}
     */
    getErrorShotComment(screenshot){
        try {
            if(this.errorshotHost){
                let screenshotMdLink = `[${screenshot.filename}](${screenshot.url})`
                return `!${screenshotMdLink}
> ${screenshotMdLink}
                `
            }else {
                return screenshot.filename;
            }
        } catch (error) {
            return `No screenshot available. There was an error: ${error}`;
        }
    }

    /**
     * @param {{title}} test
     * @return {string}
     */
    getRunComment(test) {
        let comment = test.title;
        return comment;
    }

    /**
     * @param {Object} results
     * @return {string}
     */
    getSessionIdOrJobLink (results) {
        if (!results.config.host) {
            return;
        }

        let jobLink = '';
        if (results.config.host.indexOf('saucelabs.com') > -1 || results.config.sauceConnect === true) {
            jobLink += `Check out job at https://saucelabs.com/tests/${results.sessionID}\n`;
            return jobLink;
        }else{
            return results.sessionID;
        }
    }

    /**
     * @param {object} caps
     * @param {boolean} verbose
     */
    getBrowserCombo (caps, verbose = true) {
        const device = caps.deviceName || '';
        const browser = caps.browserName || caps.browser;
        const version = caps.version || caps.platformVersion || caps.browser_version;
        const platform = caps.os ? (caps.os + ' ' + caps.os_version) : (caps.platform || caps.platformName);

        /**
         * mobile capabilities
         */
        if (device) {
            const program = (caps.app || '').replace('sauce-storage:', '') || caps.browserName;
            const executing = program ? `executing ${program}` : '';

            if (!verbose) {
                return `${device} ${platform} ${version}`;
            }

            return `${device} on ${platform} ${version} ${executing}`.trim();
        }

        if (!verbose) {
            return (browser + ' ' + (version || '') + ' ' + (platform || '')).trim();
        }

        return browser + (version ? ` (v${version})` : '') + (platform ? ` on ${platform}` : '');
    }
}

// webdriver requires class to have reporterName option
WdioTestRailReporter.reporterName = 'WebDriver.io test rail reporter';

module.exports = WdioTestRailReporter;