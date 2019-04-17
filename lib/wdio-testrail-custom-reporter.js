let path = require('path');
let TestRail = require('./test-rail');
let titleToCaseIds = require('mocha-testrail-reporter/dist/lib/shared').titleToCaseIds;
let Status = require('mocha-testrail-reporter/dist/lib/testrail.interface').Status;
let case_ids = [];
let runners = {};

const helpers = require('./helpers');
const WDIOReporter = require('@wdio/reporter').default;

module.exports = class WdioTestRailReporter extends WDIOReporter {
 constructor(options) {
  /**
   * make reporter to write to output stream by default
   */
  options = Object.assign(options, { stdout: true });
  super(options);

  this._results = [];
  this._passes = 0;
  this._fails = 0;
  this._pending = 0;
  this._out = [];
  this.currentCapability = {};
  this.runnerInfo = {};
  this.failureScreenshots = {};
  this.errorshotHost = (options.errorshotHost || null)
  this.testRail = new TestRail(options);
 }

 onTestSkip(currentTest) {
  this._pending++;
  this._out.push(`${currentTest.title} : pending`);
 }

 onTestPass(currentTest) {
  this._passes++;
  this._out.push(`${currentTest.title} : pass`);
  let caseIds = titleToCaseIds(currentTest.title);
  if (caseIds.length > 0) {
   case_ids.push(...caseIds);
   let results = caseIds.map(caseId => {
    return {
     case_id: caseId,
     status_id: Status.Passed,
     runner: this.currentCapability,
     comment: `${this.getRunComment(currentTest)}`
    };
   });
   this._results.push(...results);
  }
 }

 onTestFail(currentTest) {

  this._fails++;
  this._out.push(`${currentTest.title} : fail`);
  let caseIds = titleToCaseIds(currentTest.title);
  if (caseIds.length > 0) {
   case_ids.push(...caseIds);
   let results = caseIds.map(caseId => {
    return {
     uid: currentTest.uid,
     case_id: caseId,
     status_id: Status.Failed,
     runner: this.currentCapability,
     comment: `${this.getRunComment(currentTest)}

**${currentTest.errors[0].message}**

> ${currentTest.errors[0].stack}

----

_Additional Test Context_

**Session Id/Saucelabs Link:**
> ${this.getSessionIdOrJobLink(this.runnerInfo)}

**Browser Info:**
> ${helpers.getBrowserCombo(this.currentCapability)}
`
    };
   });
   this._results.push(...results);
  }
	}

	onAfterCommand(commandInfo){
		if (this.isScreenshotCommand(commandInfo) && commandInfo.result.value) {
						//Do something with screenshot value
			}
	}

 onRunnerStart(runnerStat) {
  this.currentCapability = runnerStat.capabilities;
  this.runnerInfo = runnerStat;
  this.setRunners(runnerStat.capabilities);
 }

 onRunnerEnd() {
  this.postResults();
 }

 postResults() {

  if (this._results.length == 0) {
   console.warn("No testcases were matched. Ensure that your tests are declared correctly and matches TCxxx\n" +
    "You may use script generate-cases to do it automatically.");
   return;
  } else {
   //attach screenshots to results
   this._results.forEach((result, idx) => {
    const { uid, comment } = result;
    if (uid) {
     this._results[idx].comment = `${comment}

**Screenshot:**
> ${this.getErrorShotComment(this.failureScreenshots[uid])}`;
    }
   });
  }

  let executionDateTime = new Date();
  let total = this._passes + this._fails + this._pending;
  let runName = this.options.runName || 'WdioTestRailReporter';
  let name = `${runName}: automated test run ${executionDateTime}`;
  let description = `${name}
**Execution summary:**
Passes: ${this._passes}
Fails: ${this._fails}
Pending: ${this._pending}
Total: ${total}
`;
  this.testRail.publish(name, description, this._results, case_ids, Object.values(runners));
 }

 /**
  * @param {object} runner
  */
 setRunners(runner) {
  const runnerSring = JSON.stringify(runner);
  if (!runner[runnerSring]) {
   runners[runnerSring] = runner;
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
 getSessionIdOrJobLink(results) {
  if (!results.config.hostname) {
   return;
  }

  let jobLink = '';
  if (results.config.hostname.indexOf('saucelabs.com') > -1 || results.config.sauceConnect === true) {
   jobLink += `Check out job at https://saucelabs.com/tests/${results.sessionId}\n`;
   return jobLink;
  } else {
   return results.sessionId;
  }
 }
 /**
   * @param {{filename,url}} screenshot
   * @return {string}
   */
 getErrorShotComment(screenshot) {
  try {
   if (this.errorshotHost) {
    let screenshotMdLink = `[${screenshot.filename}](${screenshot.url})`
    return `!${screenshotMdLink}
> ${screenshotMdLink}
             `
   } else {
    return screenshot.filename;
   }
  } catch (error) {
   return `No screenshot available. There was an error: ${error}`;
  }
	}

	isScreenshotCommand(command) {
		const isScrenshotEndpoint = /\/session\/[^/]*\/screenshot/
		return isScrenshotEndpoint.test(command.endpoint)
}
}