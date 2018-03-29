const TestRail = require('../lib/test-rail');
const fs = require('fs');
const file = require('file');
const path = require('path');
const titleToCaseIds = require('mocha-testrail-reporter/dist/lib/shared').titleToCaseIds;

class TestRailScript {

    /**
     * @param {[]} args
     */
    constructor(args) {
        const wdioConfigPath = args.shift();

        if (!wdioConfigPath) {
            throw new Error('First argument must be a path to wdio config (wdio.conf.js)');
        }
        // fs functions are relative to the current working directory where node was called
        if (!fs.existsSync(wdioConfigPath)) {
            throw new Error(`Wdio config is not found by path '${wdioConfigPath}'`);
        }

        // require is relative to the file in which you call require
        this.wdioConfig = require('../../../'+wdioConfigPath).config;
        this.testRail = new TestRail(this.wdioConfig.testRailsOptions);
        this.arguments = args;
        this.sections = {};
    }

    /**
     * Replace symbol '-' to space and convert first to upper case
     * @param {string} path
     * @return {string}
     */
    pathToSectionName(path) {
        path = path.replace('-', ' ');
        return path.charAt(0).toUpperCase() + path.slice(1);
    }

    /**
     * Replace space to symbol '-' and convert first symbol to lower case
     * @param {string} path
     * @return {string}
     */
    sectionNameToPath(name) {
        name = name.replace(' ', '-');
        return name.charAt(0).toLowerCase() + name.slice(1);
    }

    /**
     * @param {number} sectionId
     * @return {string}
     */
    getPathForSectionId(sectionId) {
        for (let path in this.sections) {
            if (this.sections[path] == sectionId) {
                return path;
            }
        }
        return '';
    }

    loadSections() {
        let sections = this.testRail.getSections();
        sections = sections.sort((section1, section2) => {
            if (section1.parent_id === section2.parent_id) {
                return 0;
            } else if (section1.parent_id > section2.parent_id) {
                return 1;
            } else {
                return -1;
            }
        });

        for (let section of sections) {
            let currentPath = this.sectionNameToPath(section.name);
            if (section.parent_id) {
                currentPath = path.join(this.getPathForSectionId(section.parent_id), currentPath);
            }
            this.sections[currentPath] = section.id;
        }
    }

    generateCases() {
        let basePath = this.arguments.shift();
        if (!basePath) {
            throw new Error('Second argument must be a path of base folder of cases');
        }
        basePath = path.resolve(basePath);

        const testFunction = process.argv[4] || 'it';

        if (!testFunction) {
          throw new Error('Third argument must be the name of your test function');
        } else{
          console.log(`Searching for test functions with '${testFunction}' keyword`);
        }

        this.loadSections();

        const itRegExp = testFunction + "(\\\s*)(\\\([\\\'|\\\"|\\\`])(.+)([\\\'|\\\"|\\\`])";
        file.walkSync(basePath, (dirPath, dirs, files) => {
            for (let fileName of files) {
                const filePath = file.path.join(dirPath, fileName);
                let data = fs.readFileSync(filePath, {encoding: "utf8"});
                const its = data.match(new RegExp(itRegExp, 'g'));
                if (its && its.length) {
                    let folders = dirPath.replace(basePath + path.sep, '');
                    let updateFile = false;

                    for (let it of its) {
                        let parts = it.match(new RegExp(itRegExp, 'i'));
                        let itDescription = parts[3];
                        let caseId = titleToCaseIds(itDescription);
                        if (!caseId.length) {
                            let sectionId = this.getSectionId(folders);
                            
                            const testRegExp = /\..*\.js/;
                            fileName = fileName.replace(testRegExp, '');

                            if (!this.sections[fileName]) {
                              let fileSectionId = this.testRail.addSection(fileName, sectionId).id;
                              this.sections[fileName] = fileSectionId;
                            }
                            let testCase = this.testRail.addTestCase(itDescription, this.sections[fileName]);
                            console.log(`TestCase ${itDescription} is created: ${testCase.id}`);

                            updateFile = true;
                            itDescription = `${itDescription} C${testCase.id}`;
                            let updatedLine = `${testFunction}` + parts[1] + parts[2] + itDescription + parts[4];
                            data = data.replace(parts[0], updatedLine);
                        }
                    }

                    if (updateFile) {
                        fs.writeFile(filePath, data, () => {
                            console.log(`File ${filePath} is updated`);
                        });
                    }
                }
            }
        });
    }

    /**
     * Create section for folder if it is not existing
     * @param {string} folder
     * @return {number|null}
     */
    getSectionId(folder) {
        if (!folder) {
            return null;
        }

        const homeRegExp = /.*\/tests/;
        folder = folder.replace(homeRegExp, '');
        
        if (!this.sections[folder]) {
            let folders = folder.split(path.sep);
            let currentFolder = folders.pop();
            let parentId = null;
            if (folders.length) {
                parentId = this.getSectionId(folders.join(path.sep));
            }

            let sectionName = this.pathToSectionName(currentFolder);
            let section = this.testRail.addSection(sectionName, parentId);
            this.sections[folder] = section.id;
            console.log(`Section ${sectionName} is created: ${this.sections[folder]}`);
        }

        return this.sections[folder];
    }
}

module.exports = TestRailScript;