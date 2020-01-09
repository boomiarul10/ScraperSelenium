var Promise = require('promise');
var package = global.createPackage();
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.seleniumWithChromeOptionsWithPath('/mnt/selenium/staging-feed/CITI/');
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(5);
var botScheduleID = "";
var fs = require('fs');
var path = require('path');
var config = global.createPackage().config;


exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, 0, 0, 0, e);
            onfailure(output);
        }
    });
}

var core = async (configuration, onsuccess, onfailure) => {
    try {
        botScheduleID = configuration.scheduleid;
        var By = selenium.By;
        var until = selenium.until;
        var driver = selenium.createDriverWithChromeCapabilities();

        await driver.get('https://securefiletransfer.citigroup.com/');
        var pagesour = await driver.getPageSource();
        var username = await driver.findElement(By.xpath("//input[@name='user']"));
        var password = await driver.findElement(By.xpath("//input[@name='password']"));
        var login = await driver.findElement(By.xpath("//input[@name='Log In']"));
        await username.sendKeys('tmpcocl');
        await password.sendKeys('Changeme123');
        await login.click();
        await driver.sleep(4000);
        var fileClick = await driver.findElement(By.xpath('//*[@id="f_0"]'));
        await fileClick.click();


        var downloadPath = '/mnt/selenium/staging-feed/CITI/Citi_Talentbrew.xml';
        if (fs.existsSync(downloadPath)) {
            fs.unlinkSync(downloadPath);
        }

        var downloadElem = await driver.findElement(By.xpath("//input[@value='Download']"));
        await downloadElem.click();
        await driver.sleep(180000);

        if (!fs.existsSync(downloadPath)) {
            await driver.sleep(120000);
            if (fs.existsSync(downloadPath)) {
                //var data = fs.readFileSync(downloadPath, { encoding: 'utf-8' });
                //var count = data.match(/<record>/g).length;
                service.bot.setProgress(botScheduleID, log.logType.activity, 'Scrape Completed');
                service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.completed, 0, 0, 0);
            } else {
                //var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, 0, 0, 0, "File download took more time than usual");
                //onfailure(output);
            }
            await driver.quit();
        } else {
            //var data = fs.readFileSync(downloadPath, { encoding: 'utf-8' });
            //var count = data.match(/<record>/g).length;
            service.bot.setProgress(botScheduleID, log.logType.activity, 'Scrape Completed');
            service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.completed, 0, 0, 0);
            await driver.quit();
        }


    } catch (e) {
        try {
            await driver.quit();
        } catch (ex) {
        }
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, 0, 0, 0, e);
        onfailure(output);
    }
}