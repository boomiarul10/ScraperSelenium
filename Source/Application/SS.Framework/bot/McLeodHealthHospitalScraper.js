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

        await driver.get('https://mcleod.silkroad.com/epostings/index.cfm?fuseaction=app.welcome&company_id=16103&version=1');
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
                var jobContainer = await driver.findElements(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]/td[2]"));
                        var title = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]/td[1]"));
                        var jobId = await idElement.getText();
                        var locationElement = await driver.findElement(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]/td[3]"));
                        var location = await locationElement.getText();
                        var urlElement = await driver.findElement(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]/td[2]/a"));
                        var url = await urlElement.getAttribute("href");

                        await driverjobdetails.get(url);

                        var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='applyJob']/dl"));
                        var description = await jobDescription.getAttribute("outerHTML");
                        var titleDescriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobTitleDiv']"));
                        var titleDescription = await titleDescriptionElement.getAttribute("outerHTML");
                        var typeDescriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='applyJob']/div[@class='cssDspJobHead']"));
                        var typeDescription = await typeDescriptionElement.getAttribute("outerHTML");

                        var statusElement = await driverjobdetails.findElement(By.xpath("//*[@id='translatedJobPostingTypeDiv']"));
                        var jobStatus = await statusElement.getText();

                        var typeElement = await driverjobdetails.findElements(By.xpath("//*[@id='applyJob']/div[@class='cssDspJobBody'][1]"));
                        if (typeElement.length == 1) {
                            var typeElement = await driverjobdetails.findElement(By.xpath("//*[@id='applyJob']/div[@class='cssDspJobBody'][1]"));
                            var type = await typeElement.getText();
                        }

                        var addrElement = await driverjobdetails.findElements(By.xpath("//*[@id='applyJob']/div[@class='cssDspJobBody'][2]"));
                        if (addrElement.length == 1) {
                            var addrElement = await driverjobdetails.findElement(By.xpath("//*[@id='applyJob']/div[@class='cssDspJobBody'][2]"));
                            var addr = await addrElement.getText();
                        }

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobId;

                        var descriptionText = titleDescription + description;
                        if (type != "") {
                            descriptionText += '<div class="cssDspJobHead">Position Type Details</div ><div class="cssDspJobBody"><div class="cssDspJobBody">' + type + '</div>';
                            if (addr != "") {
                                descriptionText += '<div class="cssDspJobHead">Physical Address</div ><div class="cssDspJobBody"><div class="cssDspJobBody">' + addr + '</div>';
                            }
                        }

                        job.TEXT = HtmlEscape(descriptionText);
                        job.JOB_CATEGORY = category;
                        url = url.replace('36332%2C', '');
                        job.JOB_APPLY_URL = url;
                        job.JOB_TYPE = type;
                        job.JOB_STATUS = jobStatus;
                        if (location) {
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
                        job.JOB_CONTACT_COMPANY = "McLeod Health Hospital";
                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (isPresent);
            var HomeElement = await driver.findElements(By.xpath('//*[@id="searchResultsFoot"]'));
            var home = HomeElement.length;
            if (home) {
                var nextLink = await driver.findElement(By.xpath('//*[@id="searchResultsFoot"]'));
                await nextLink.click();
            }
        }
        await driver.quit();
        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, ' ');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
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