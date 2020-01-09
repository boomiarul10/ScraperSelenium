var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(2);
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

        await driver.get('https://recruiting.ultipro.com/HEN1002HENL/JobBoard/f6331d73-426f-40dc-8e2f-04e322b60259');
        await driver.sleep(2000);
        var totalJobElement = await driver.findElement(By.xpath('//*[@id="SearchCount"]//span[@data-automation="opportunities-count"]'));
        var totalJobCount = await totalJobElement.getText();
        var jobCount = totalJobCount.split("are");
        var atsCount = jobCount[1].replace("opportunities", "").trim();
        jobMaker.setatsJobCount(parseInt(atsCount));

        var allJobs;
        do {
            allJobs = false;
            var loadJobsElement = await driver.findElements(By.xpath('//h5[contains(@style, "display: none")]//*[@id="LoadMoreJobs"]'));
            var loadJobs = await loadJobsElement.length;
            if (!loadJobs) {
                var loadJobsElement = await driver.findElement(By.xpath('//*[@id="LoadMoreJobs"]'));
                await loadJobsElement.click();
                await driver.sleep(2000);
                allJobs = true;
            }
        } while (allJobs);

        var counter = 1;
        do {

            var jobContainer = await driver.findElements(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();

                    var titleElement = await driver.findElement(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']//h3/a'));
                    job.JOB_TITLE = await titleElement.getText();

                    var urlElement = await driver.findElement(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']//h3/a'));
                    var url = await urlElement.getAttribute("href");
                    await driverjobdetails.get(url);

                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]'));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {

                        var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@data-automation="job-category"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var dateElement = await driverjobdetails.findElement(By.xpath('//*[@data-automation="job-posted-date"]'));
                        var date = await dateElement.getText();

                        job.ASSIGNMENT_START_DATE = formatDate(date);

                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="JobWorkLocationName"]'));
                        var location = await locationElement.getAttribute("innerHTML");
                        if (location != null) {
                            var loc = location.split(",");
                            if (loc.length == 2) {
                                job.JOB_LOCATION_CITY = loc[0].trim();
                                job.JOB_LOCATION_STATE = loc[1].trim();
                            }
                            else if (loc.length == 3) {
                                job.JOB_LOCATION_CITY = loc[0].trim();
                                job.JOB_LOCATION_STATE = loc[1].trim();
                                job.JOB_LOCATION_COUNTRY = loc[2].trim();
                            }
                            else {
                                job.JOB_LOCATION_CITY = location.trim();
                            }
                        }
                        var jobOtherLocationsElement = await driverjobdetails.findElements(By.xpath('//*[@data-automation="show-secondary-physical-locations"][contains(text(),"more")]'));
                        var isOtherLocations = await jobOtherLocationsElement.length;
                        if (isOtherLocations) {
                            var loadSecondaryLocationElement = await driverjobdetails.findElement(By.xpath('//*[@data-automation="show-secondary-physical-locations"][contains(text(),"more")]'));
                            await loadSecondaryLocationElement.click();

                            var otherLocationValue = "";
                            var otherLocationsElement = await driverjobdetails.findElements(By.xpath('//*[@data-automation="work-location-list"]/li'));
                            var otherLocationsLength = await otherLocationsElement.length;
                            for (var i = 1; i <= otherLocationsLength; i++) {
                                var secondaryLocationElement = await driverjobdetails.findElement(By.xpath('//*[@data-automation="work-location-list"]/li[' + i + ']'));
                                var secondaryLocation = await secondaryLocationElement.getText();

                                if (i < otherLocationsLength) {
                                    otherLocationValue += secondaryLocation + ';';
                                }
                                else {
                                    otherLocationValue += secondaryLocation;
                                }
                            }

                            job.OTHER_LOCATIONS = otherLocationValue;
                        }
                        var applyUrlElement = await driverjobdetails.findElement(By.xpath('//*[@data-automation="apply-now-button"]'));
                        var applyUrl = await applyUrlElement.getAttribute("href");

                        job.JOB_APPLY_URL = applyUrl;
                        if (applyUrl) {
                            var jobId = applyUrl.split("opportunityId%3D");
                            var id = jobId[1].split("&cancel");
                            job.JDTID_UNIQUE_NUMBER = id[0].trim();
                        }

                        var contactCityElement1 = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]//p[contains(text(),"#")]'));
                        var isContactCity1 = await contactCityElement1.length;
                        var contactCityElement2 = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]//p/span[contains(text(),"#")]'));
                        var isContactCity2 = await contactCityElement2.length;
                        if (isContactCity1) {
                            var contactCity = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-description"]//p[contains(text(),"#")]'));
                            var contact = await contactCity.getText();
                            job.JOB_CONTACT_CITY = contact.replace(/#/g, ' ').trim();
                        }
                        else if (isContactCity2) {
                            var contactCity = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-description"]//p/span[contains(text(),"#")]'));
                            var contact = await contactCity.getText();
                            job.JOB_CONTACT_CITY = contact.replace(/#/g, ' ').trim();
                        }

                        var relocationElement1 = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]//p[contains(text(),"%")]'));
                        var isRelocation1 = await relocationElement1.length;
                        var relocationElement2 = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]//p/span[contains(text(),"%")]'));
                        var isRelocation2 = await relocationElement2.length;
                        var relocationElement3 = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]//p/em[contains(text(),"%")]'));
                        var isRelocation3 = await relocationElement3.length;
                        if (isRelocation1) {
                            var relocation = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-description"]//p[contains(text(),"%")]'));
                            var zipCode = await relocation.getText();
                            job.JOB_LOCATION_ZIP = zipCode.replace(/%/g, ' ').trim();
                        }
                        else if (isRelocation2) {
                            var relocation = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-description"]//p/span[contains(text(),"%")]'));
                            var zipCode = await relocation.getText();
                            job.JOB_LOCATION_ZIP = zipCode.replace(/%/g, ' ').trim();
                        }
                        else if (isRelocation3){
                            var relocation = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-description"]//p/em[contains(text(),"%")]'));
                            var zipCode = await relocation.getText();
                            job.JOB_LOCATION_ZIP = zipCode.replace(/%/g, ' ').trim();
                        }

                        var typeElement = await driverjobdetails.findElements(By.xpath('//*[@id="JobFullTime"]'));
                        var isType = await typeElement.length;
                        if (isType) {
                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="JobFullTime"]'));
                            job.JOB_TYPE = await type.getText();
                        }

                        var jobdesc = await driverjobdetails.findElement(By.xpath('//*[@data-automation="job-description"]'));
                        var desc = await jobdesc.getAttribute("outerHTML");
                        job.TEXT = HtmlEscape(desc);
                    }
                    jobMaker.successful.add(job, botScheduleID);
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);

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
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
    return description;
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [month, day, year].join('/');
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