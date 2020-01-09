var Promise = require('promise');
var path = require('path');
var config = global.createPackage().config;

var downloadPath = path.normalize(config.downloadPath + "/");

exports.selenium = () => {
    webdriver = require('selenium-webdriver');
    return new createInstance(webdriver);
}

this.createDriverForJD = (browsertype) => {
    if (config.enableGrid) {
        return new webdriver.Builder()
            .forBrowser(browsertype)
            .usingServer(config.jdhubUrl)
            .build();
    } else {
        return new webdriver.Builder()
            .forBrowser(browsertype)
            .build();
    }
};


exports.seleniumWithChromeOptions = () => {
    webdriver = require('selenium-webdriver');
    chrome = require('selenium-webdriver/chrome');

    var chromeOptions = new chrome.Options();
    chromeOptions.setUserPreferences({ 'profile.default_content_setting_values.notifications': 2, 'download.default_directory': downloadPath, 'download.prompt_for_download': false, 'safebrowsing.enabled': true });


    return new createInstance(webdriver, chromeOptions);
}

exports.seleniumWithChromeOptionsWithPath = (path) => {
    webdriver = require('selenium-webdriver');
    chrome = require('selenium-webdriver/chrome');

    var chromeOptions = new chrome.Options();
    chromeOptions.setUserPreferences({ 'profile.default_content_setting_values.notifications': 2, 'download.default_directory': path, 'download.prompt_for_download': false, 'safebrowsing.enabled': true });


    return new createInstance(webdriver, chromeOptions);
}


function createInstance(webdriver, browserOptions) {
    this.By = webdriver.By;
    this.until = webdriver.until;
    DesiredCapabilities = webdriver.Capabilities;

    var phantomCapability = DesiredCapabilities
        .phantomjs()
        .set("phantomjs.cli.args", ["--ssl-protocol=any", "--ignore-ssl-errors=true"]);
        
    this.createDriver = (browsertype) => {
        if (config.enableGrid) {
            return new webdriver.Builder()
                .forBrowser(browsertype)
                .usingServer(config.hubUrl)
                .build();
        } else {
            return new webdriver.Builder()
                .forBrowser(browsertype)
                .build();
        }
    };

    this.createDriverWithCapabilties = () => {
        if (config.enableGrid) {
            return new webdriver.Builder()
                .withCapabilities(phantomCapability)
                .usingServer(config.hubUrl)
                .build();
        } else {
            return new webdriver.Builder()
                .withCapabilities(phantomCapability)
                .build();
        }
    };

    this.createDriverWithChromeCapabilities = () => {
        if (config.enableGrid) {
            return new webdriver.Builder()
                .forBrowser('chrome')
                .withCapabilities(browserOptions.toCapabilities())
                .usingServer(config.hubUrl)
                .build();
        } else {
            return new webdriver.Builder()
                .forBrowser('chrome')
                .withCapabilities(browserOptions.toCapabilities())
                .build();
        }
    };

    this.getElementValue = async (driver, path) => {
        return new Promise((onsuccess, onfailure) => {
            driver
                .findElement(By.xpath(path))
                .then((element) => {
                    element
                        .getText()
                        .then(onsuccess(value))
                        .catch(onfailure(e));
                })
                .catch(onfailure(e));
        });
    };
}