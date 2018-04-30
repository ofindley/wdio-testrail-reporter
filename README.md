#Testrail Reporter for Webdriver.io

Pushes test results into Testrail system.
Fork from [mocha testrail reporter](https://www.npmjs.com/package/mocha-testrail-reporter)

## Installation

```shell
$ npm install wdio-testrail-custom-reporter --save-dev
```

## Usage
Ensure that your testrail installation API is enabled and generate your API keys. See http://docs.gurock.com/

Add reporter to wdio.conf.js:

```Javascript
let WdioTestRailReporter = require('wdio-testrail-custom-reporter');

...

    reporters: ['spec', WdioTestRailReporter],
    testRailsOptions: {
      domain: "yourdomain.testrail.net",
      username: "username",
      password: "password",
      projectId: 1,
      suiteId: 1,
      runName: "My test run"
      includeAllTest: true
    }
```


Mark your mocha test names with ID of Testrail test cases. Ensure that your case ids are well distinct from test descriptions.
 
```Javascript
it("C123 Authenticate with invalid user", . . .
it("Authenticate a valid user C321", . . .
```

Only passed or failed tests will be published. Skipped or pending tests will not be published resulting in a "Pending" status in testrail test run.

## Options

**domain**: *string* domain name of your Testrail instance (e.g. for a hosted instance instance.testrail.net)

**username**: *string* user under which the test run will be created (e.g. jenkins or ci)

**password**: *string* password or API token for user

**projectId**: *number* projet number with which the tests are associated

**suiteId**: *number* suite number with which the tests are associated

**assignedToId**: *number* (optional) user id which will be assigned failed tests

**includeAllTest**: *number* (optional) default true, if false only tests that were ran with show within test run on TestRail

## Automatic creation of sections and cases
You can use next command to generate sections/cases based on your tests in test real:
```shell
node ./node_modules/wdio-testrail-reporter/scripts/generate-cases.js {relative_path_to_your_wdio.conf} {relative_path_to_your_test_folder}
```
Example:
You have tests structure:
```
- node_modules
- test-project
-- wdio.conf.js
-- tests
--- test-group-1
---- test-1.js
--- test-group-2
---- test-sub-group-1
----- test-2.js
----- test-3.js
---- test-sub-groop-2
----- test-4.js
```
Command:
```shell
node ./node_modules/wdio-testrail-reporter/scripts/generate-cases.js ./wdio.conf.js ./tests
```
will create in test rail:
- section 'test-group-1'
- subsection 'test-1'
- cases that are described in test-1.js inside subsection 'test-1'

- section 'test-group-2'
- subsection 'test-sub-group-1' inside section 'test-group-2'
- subsection 'test-2' inside subsection 'test-sub-group-1'
- subsection 'test-3' inside subsection 'test-sub-group-1'
- cases that are described in test-2.js inside subsection 'test-2'
- cases that are described in test-3.js inside subsection 'test-3'

- subsection 'test-sub-group-2' inside section 'test-group-2'
- subsection 'test-4' inside subsection 'test-sub-group-2'
- cases that are described in test-4.js inside subsection 'test-4'

also test files (test-1.js - test-4.js) will be updated: id of case will be added to test() function

If your test function is not 'it' then you can specify your test function name as a third argument
Command:
```shell
node ./node_modules/wdio-testrail-reporter/scripts/generate-cases.js ./wdio.conf.js ./tests testFunctionName
```

## Furture updates
- File structure changes as options 

## References
- https://www.npmjs.com/package/mocha-testrail-reporter
- http://webdriver.io/guide/reporters/customreporter.html
- http://docs.gurock.com/testrail-api2/start