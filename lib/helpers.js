 /**
  * By using the information provided by a capability object,
  * a string is returned that includes the browser, its'
  * version and which platform it is on.
  *
  * @param {object} caps
  * @param {boolean} verbose
  * @return {string}
  */
 function getBrowserCombo(caps, verbose = true) {
    const device = caps.deviceName || '';
    const browser = caps.browserName || caps.browser;
    const version = caps.version || caps.platformVersion || caps.browser_version;
				const platform = caps.os ? (caps.os + ' ' + caps.os_version) : (caps.platform || caps.platformName);
				const customName = caps.customName || null;

				/**
					* Custom name
				 */

					if(customName){
						 return customName + ' - ' + browser + (version ? ` (v${version})` : '')
					}

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

module.exports = {
   getBrowserCombo
};