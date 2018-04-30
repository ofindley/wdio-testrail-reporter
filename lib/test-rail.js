const request = require("sync-request");

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
     * @param {string} name
     * @param {string} description
     * @return {*}
     */
    addRun(name, description, case_ids) {
        return this._post(`add_run/${this.options.projectId}`, {
            "suite_id": this.options.suiteId,
            "name": name,
            "description": description,
            "assignedto_id": this.options.assignedToId,
            "include_all": this.options.includeAllTest,
            "case_ids": case_ids
        });
    }

    /**
     * Publishes results of execution of an automated test run
     * @param {string} name
     * @param {string} description
     * @param {[]} results
     * @param {callback} callback
     */
    publish(name, description, results, case_ids, callback = undefined) {
        let run = this.addRun(name, description, case_ids);
        console.log(`Results published to ${this.base}?/runs/view/${run.id}`);
        let body = this.addResultsForCases(run.id, results);
        // execute callback if specified
        if (callback) {
            callback(body);
        }
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
}

module.exports = TestRail;