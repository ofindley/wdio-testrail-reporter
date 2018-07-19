const request = require("sync-request");
const helpers = require('./helpers');

/**
 * TestRail basic API wrapper
 */
class TestRail {

    /**
     * @param {{domain, projectId, suiteId, assignedToId, username, password}} options
     */
    constructor(options) {
        this._validate(options, 'domain');
        this._validate(options, 'username');
        this._validate(options, 'password');
        this._validate(options, 'projectId');
        this._validate(options, 'suiteId');

        // compute base url
        this.options = options;
        this.base = `https://${options.domain}/index.php`;
    }


    /**
     * @param {{}} options
     * @param {string} name
     * @private
     */
    _validate(options, name) {
        if (options == null) {
            throw new Error("Missing testRailsOptions in wdio.conf");
        }
        if (options[name] == null) {
            throw new Error(`Missing ${name} value. Please update testRailsOptions in wdio.conf`);
        }
    }

    /**
     * @param {string} path
     * @return {string}
     * @private
     */
    _url(path) {
        return `${this.base}?${path}`;
    }

    /**
     * @callback callback
     * @param {{}}
     */

    /**
     * @param {string} api
     * @param {*} body
     * @param {callback} callback
     * @param {callback} error
     * @return {*}
     * @private
     */
    _post(api, body, error = undefined) {
        return this._request("POST", api, body, error);
    }

    /**
     * @param {string} api
     * @param {callback} error
     * @return {*}
     * @private
     */
    _get(api, error = undefined) {
        return this._request("GET", api, null, error);
    }
    /**
     * @param {string} method
     * @param {string} api
     * @param {*} body
     * @param {callback} callback
     * @param {callback} error
     * @return {*}
     * @private
     */
    _request(method, api, body, error = undefined) {
        let options = {
            headers: {
                "Authorization": "Basic " + new Buffer(this.options.username + ":" + this.options.password).toString("base64"),
                "Content-Type": "application/json"
            },
        };
        if (body) {
            options['json'] = body;
        }

        let result = request(method, this._url(`/api/v2/${api}`), options);
        result = JSON.parse(result.getBody('utf8'));
        if (result.error) {
            console.log("Error: %s", JSON.stringify(result.body));
            if (error) {
                error(result.error);
            } else {
                throw new Error(result.error);
            }
        }
        return result;
    }

    /**
	 * Creates a new array of unique data from the data
	 * within 2 existing arrays
	 *
	 * @param {Array.<*>} currArr
	 * @param {Array.<*>} newArr
	 * @returns {array}
	 * @private
	 */
	_createUniqueArray(currArr, newArr) {
		return [...new Set([...newArr, ...currArr])]
	}

    /**
     * @param {string} title
     * @param {number|null} parentId
     * @return {{id}}
     */
    addSection(title, parentId = null) {
        let body = {
            "suite_id": this.options.suiteId,
            "name": title,
        };
        if (parentId) {
            body['parent_id'] = parentId;
        }
        return this._post(`add_section/${this.options.projectId}`, body);
    }

    /**
     * @return {[]}
     */
    getSections() {
        return this._get(`get_sections/${this.options.projectId}&suite_id=${this.options.suiteId}`);
    }

    /**
     * @return {[]}
     */
    getCases() {
        return this._get(`get_cases/${this.options.projectId}\&suite_id=${this.options.suiteId}`);
    }

      /**
       * @return {[]}
       */
      updateCaseById(case_id, testCaseName) {
        let body = {
          "title": testCaseName,
      };
        return this._post(`update_case/${case_id}`, body);
    }

    /**
	 * Creates a new test plan
	 *
	 * @param {string} name - Plan name
	 * @param {string} desc - Plane description
	 * @param {Array.<Object>} testRuns - Test runs
	 * @returns {*} API response
	 */
	addPlan(name, description, testRuns) {
		return this._post(`add_plan/${this.options.projectId}`, {
			"name": name,
			"description": description,
			"entries": testRuns
		});
    }

    /**
	 * Retrieves a test plan
	 *
	 * @param {number} planId - Plan identifier
	 * @returns {*} API response
	 */
	getPlan(planId) {
		return this._get(`get_plan/${this.options.updatePlan}`);
    }

    /**
	 * Adds a test plan entry to the current project
	 *
	 * @param {number} planId - Plan identifier
	 * @param {number} suiteId  - Suite identifier
	 * @param {string} name - Plan name
	 * @param {string} desc - Plan name
	 * @param {Array.<Object>} runs - Test runs
	 * @param {Array.<number>} caseIds - Test case identifiers
	 * @return {*} API response
	 */
	addTestPlanEntry(planId, suiteId, name, desc, runs, caseIds) {
		return this._post(
			`add_plan_entry/${planId}`, {
				'include_all': this.options.includeAllTest,
				'suite_id': suiteId,
				'name': name,
				'description': desc,
				'runs': runs,
				'case_ids': caseIds
			});
    }

    /**
	 * Adds missing case ids to a test plan entry
	 *
	 * @param {number} planId - Plan identifier
	 * @param {number} entryId  - Entry identifier
	 * @param {Array.<number>} caseIds - Test case identifiers
	 * @return {*} API response
	 */
	updateTestPlanEntry(planId, entryId, caseIds) {
		return this._post(`update_plan_entry/${planId}/${entryId}`, {
			case_ids: caseIds
		});
    }

    /**
	 * Gets a suite
	 *
	 * @param {number} suiteId - Suite identifier
	 * @return {*} API response
	 */
	getSuite(suiteId) {
		return this._get(`get_suite/${suiteId}`);
    }

    /**
	 * Gets all the tests in a run
	 *
	 * @param {number} runId - Run identifier
	 * @return {*} API response
	 */
	getTestsForRun(runId) {
		return this._get(`get_tests/${runId}`)
	}

    /**
     * @param {string} title
     * @param {number} sectionId
     * @return {{id}}
     */
    addTestCase(title, sectionId) {
        return this._post(`add_case/${sectionId}`, {
            "title": title
        });
    }

	/**
	 * Adds a test run
	 *
	 * @param {string} name - Test run name
	 * @param {string} description - Test run description
	 * @param {number} suiteId - Suite id for test cases in this run
	 * @return {*} API response
	 */
	addRun(name, description, suiteId, caseIds) {
		return this._post(`add_run/${this.options.projectId}`, {
			"suite_id": suiteId,
			"name": name,
			"description": description,
			"assignedto_id": this.options.assignedToId,
			"include_all": this.options.includeAllTest,
			"case_ids": caseIds
		});
	}

    /**
	 * Adds test cases to a test run
	 *
	 * @param {number} runId - Run identifier
	 * @param {Array.<Object>} cases - Test case data
	 * @return {*} API response
	 */
	addCasesToRun(runId, cases) {
		const currentCases = this.getTestsForRun(runId).map(c => c.case_id);
		this._post(`update_run/${runId}`, {
			'case_ids': this._createUniqueArray(currentCases, cases)
		});
    }

    /**
	 * Get test cases that belong to a suite
	 *
	 * @param {*} projectId - Project identifier
	 * @param {*} suiteId - Suite identifier
	 * @return {*} API response
	 */
	getTestsForSuite(projectId, suiteId) {
		return this._get(`get_cases/${projectId}&suite_id=${suiteId}`);
    }

    /**
     * @param {number} runId
     * @param {{case_id, status_id, comment}[]} results
     * @return {*}
     */
    addResultsForCases(runId, results) {
        return this._post(`add_results_for_cases/${runId}`, {
            results: results
        });
    }

    /**
     * Publishes results of execution of an automated test run
     * @param {string} name
     * @param {string} description
     * @param {[]} results
     * @param {callback} callback
     */
    publish(name, description, results, case_ids, runners ,callback = undefined) {
        let runs = [];
		let body = null;
        let plan = null

        if(typeof this.options.suiteId !== 'number'){
            if (this.options.updatePlan) {

                //1. find our existing plan
				plan = this.getPlan(this.options.updatePlan);

				plan.entries.forEach(entry => {

					const suiteInfo = this.getSuite(entry.runs[0].suite_id);
					const currentCases = this.getTestsForRun(entry.runs[0].id).map(c => c.case_id);
					suiteInfo.cases = this.getTestsForSuite(this.options.projectId, suiteInfo.id).map(c => c.id);
					suiteInfo.newCases = results.filter(r => suiteInfo.cases.includes(r.case_id));

					//reset case id listing
					this.updateTestPlanEntry(
						plan.id,
						entry.id,
						this._createUniqueArray(
							currentCases,
							suiteInfo.newCases.map(r => r.case_id)
						)
					)
					body = [];
					//add new results
					body.push(this.addResultsForCases(entry.runs[0].id, suiteInfo.newCases));
				})
            }else {
                let testPlanEntries = []
				//1. create the test plan
				plan = this.addPlan(name, description, []);
				runners.forEach((runner, runnerIdx) => {
					this.options.suiteId.forEach((suiteId, suiteIdx) => {
						const suiteInfo = this.getSuite(suiteId);
						suiteInfo.cases = this.getTestsForSuite(this.options.projectId, suiteId).map(c => c.id);
						//runs =
						testPlanEntries.push(
							this.addTestPlanEntry(
								plan.id,
								suiteId,
								`(${helpers.getBrowserCombo(runner)})`,
								description, [],
								results.filter(result => {
									return JSON.stringify(result.runner) === JSON.stringify(runner);
                                }).map(result => result.case_id)).runs[0]);

						body = [];

						body.push(
							this.addResultsForCases(
								testPlanEntries.slice(-1)[0].id,
								results.filter(r => suiteInfo.cases.includes(r.case_id) &&
									JSON.stringify(r.runner) === JSON.stringify(runner))
							)
						);
					})
				})
			}

			console.log(`Results published to ${this.base}?/plans/view/${plan.id}`);
			console.log(`Add updatePlan: ${plan.id} to your config to update this plan.`);
        }else{
            if(this.options.updateRun){
                //update existing run
				runs[0] = {
					id: this.options.updateRun
				};

				//add any missing test case ids to a run
				this.addCasesToRun(runs[0].id, results.map(r => r.case_id));
            }else{
                // add results for a run
                runners.forEach((runner, idx) => {
                    const runName = `${name} - (${runner.deviceName||runner.platform} - ${runner.browserName})`;
                    runs.push(this.addRun(runName, description, this.options.suiteId, results.filter(result => {
						return JSON.stringify(result.runner) === JSON.stringify(runner);
                    }).map(result => result.case_id)));
                    this.addResultsForCases(runs[idx].id, results);
                });
            }

            console.log(`Results published to ${this.base}?/runs/view/${runs[0].id}`);
			console.log(`Add updateRun: ${runs[0].id} to your config to update this run.`);
        }

        // execute callback if specified
        if (callback) {
            callback(body);
        }
    }
}

module.exports = TestRail;