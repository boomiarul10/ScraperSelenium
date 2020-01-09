var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(5);
var botScheduleID = "";

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
            onfailure(output);
        }
    });
}

var core = async (configuration, onsuccess, onfailure) => {
    try {
        botScheduleID = configuration.scheduleid;
        var By = selenium.By;
        var until = selenium.until;
        var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");


        await driver.get('https://hbfuller-openhire.silkroad.com/epostings/index.cfm?version=1&company_id=16441');
        var searchElement = await driver.findElement(By.xpath('//button[@id="Search"]'));
        await searchElement.click();

        var recordsCount = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[2]/span'));
        var records = await recordsCount.getText();
        jobMaker.setatsJobCount(parseInt(records));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="byCat"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="byCat"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//button[@id="Search"]'));
            await submitElement.click();

            var prime = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath("//*[@id='box_col_center_L_Col']/div[3]/table/tbody/tr[" + prime + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath("//*[@id='box_col_center_L_Col']/div[3]/table/tbody/tr[" + prime + "]/td[2]/a"));
                        var title = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath("//*[@id='box_col_center_L_Col']/div[3]/table/tbody/tr[" + prime + "]/td[1]"));
                        var jobId = await idElement.getText();
                        var locationElement = await driver.findElement(By.xpath("//*[@id='box_col_center_L_Col']/div[3]/table/tbody/tr[" + prime + "]/td[3]"));
                        var location = await locationElement.getText();
                        var applyURL = await titleElement.getAttribute("href");

                        await driverjobdetails.get(applyURL);

                        var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='applyJob']/dl"));
                        var description = await jobDescription.getAttribute("outerHTML");                                                
                        var typeElement = await driverjobdetails.findElement(By.xpath("//*[@id='translatedJobPostingTypeDiv']"));
                        var type = await typeElement.getText();

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobId;
                        var descriptionText = HtmlEscape(description)
                        job.TEXT = descriptionText;
                        job.JOB_CATEGORY = category;
                        
                        job.JOB_APPLY_URL = applyURL;
                        job.JOB_TYPE = type;
                        
                        if (location) {
                            location = location.replace('6th of October City', 'City').replace('.', '');
                            var loc = location.split(",");
                            if (loc.length == 3) {
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[2];
                            }
                            else if (loc.length == 4) {
                                job.JOB_LOCATION_CITY = loc[1];
                                job.JOB_LOCATION_STATE = loc[2];
                                job.JOB_LOCATION_COUNTRY = loc[3];
                            }
                            else if (loc.length == 5) {
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[3];
                                job.JOB_LOCATION_COUNTRY = loc[4];
                            }
                        }                        
                        
                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (isPresent);
            try {
                var ListElement = await driver.findElements(By.xpath('//*[@id="returnButton"]'));
                var list = await ListElement.length;
                if (list) {
                    var HomeElement = await driver.findElement(By.xpath('//*[@id="returnButton"]'));
                    await HomeElement.click();
                }
            }
            catch (e) {
            }
        }
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
    description = description.replace(/&dash;+/g, "&#8208;");
    return description;
}


var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator").then(values => {
        var snippet = package.resource.download.snippet("feedgenerator");
        var input = snippet.createInput(configuration, jobs);
        snippet
            .execute(input)
            .then(jobcount => {
                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
                onsuccess(output);
            })
            .catch(err => {
                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
                onfailure(output);
            });
    });
}