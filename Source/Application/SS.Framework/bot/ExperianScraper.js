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

        await driver.get('https://experian.taleo.net/careersection/sitemap.jss?portalCode=2&lang=pt_BR');
        await driver.sleep(2000);
        var urls = [];
        var totalBrazilJobElement = await driver.findElements(By.xpath('//*[contains(text(),"http")][@class="text"]'));
        var totalBrazilJobCount = await totalBrazilJobElement.length;

        await driver.get('https://experian.taleo.net/careersection/sitemap.jss?portalCode=2&lang=en');
        await driver.sleep(2000);

        var urls = [];
        var totalJobElement = await driver.findElements(By.xpath('//*[contains(text(),"http")][@class="text"]'));
        var totalJobCount = await totalJobElement.length;

        var totaljobs = totalBrazilJobCount + totalJobCount;

        // jobMaker.setatsJobCount(parseInt(totalJobCount));
        jobMaker.setatsJobCount(parseInt(totaljobs));

        var atscount = totalJobCount;
        var atscnt = 1;

        for (var i = 0; i < totalJobCount; i++) {
            var url = await totalJobElement[i].getText();
            urls.push(url);
        }

        for (var j = 0; j < totalJobCount; j++) {
            try {
                var job = jobMaker.create();
                await driverjobdetails.get(urls[j]);
                await driver.sleep(2000);
                var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="editablesection"]'));
                var isDetailPage = await jobdetailspage.length;
                if (isDetailPage) {
                    var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                    job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                    job.JOB_APPLY_URL = "https://experian.taleo.net/careersection/2/jobapply.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                    var titleElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqTitleLinkAction.row1"]'));
                    job.JOB_TITLE = await titleElement.getText();
                    var locationsElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1683.row1"]'));
                    var islocation = await locationsElement.length;
                    if (islocation) {
                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1683.row1"]'));
                        var location = await locationElement.getText();

                        if (location) {
                            var loc = location.split("-");
                            if (loc.length == 3) {
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            else if (loc.length == 2) {
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            else if (loc.length == 4) {
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[3];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            else {
                                job.JOB_LOCATION_COUNTRY = location;
                            }
                        }
                    }

                    var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1633.row1"]'));
                    job.JOB_CATEGORY = await categoryElement.getText();

                    var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                    job.ASSIGNMENT_START_DATE = await dateElement.getText();

                    var relocationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1733.row1"]'));
                    var isrelocation = await relocationElement.length;
                    if (isrelocation) {
                        var relocation = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1733.row1"]'));
                        job.RELOCATION = await relocation.getText();
                    }



                    var scheduleElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1783.row1"]'));
                    var isschedule = await scheduleElement.length;
                    if (isschedule) {
                        var schedule = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1783.row1"]'));
                        job.JOB_TYPE = await schedule.getText();
                    }

                    var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//h2/div/span[text()='Description']]"));
                    var desc1 = await descriptionElement.getAttribute("outerHTML");
                    var jobDescriptionElement = await driverjobdetails.findElement(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//h2/div/span[text()='Knowledge, Experience & Qualifications']]"));
                    var desc2 = await jobDescriptionElement.getAttribute("outerHTML");
                    // var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID2978.row"]/td/div/div[3]'));
                    //var desc3 = await jobDescElement.getAttribute("outerHTML");

                    var jobDescription = '<span class=""> </span>' + desc1 + desc2 + '<span class=""> </span>';
                   
                    var optionsTag = {
                        'add-remove-tags': ['input', 'h1', 'h2', 'imagedata']
                    };
                   
                    jobDescription = jobDescription.replace(/<tr/g, "<font");
                    jobDescription = jobDescription.replace(/<\/tr/g, "</font");
                    jobDescription = jobDescription.replace(/<td/g, "<font");
                    jobDescription = jobDescription.replace(/<\/td/g, "</font");
                    jobDescription = jobDescription.replace(/<th/g, "<font");
                    jobDescription = jobDescription.replace(/<\/th/g, "</font");
                    jobDescription = jobDescription.replace(/<tbody/g, "<font");
                    jobDescription = jobDescription.replace(/<\/tbody/g, "</font");
                    jobDescription = jobDescription.replace(/<span/g, "<font");
                    jobDescription = jobDescription.replace(/<\/span/g, "</font");
                    jobDescription = jobDescription.replace(/<div/g, "<font");
                    jobDescription = jobDescription.replace(/<\/div/g, "</font");


                    job.TEXT = HtmlEscape(jobDescription);

                }
                jobMaker.successful.add(job, botScheduleID);
                atscnt++;

            } catch (e) {
                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                atscnt++;
            }
        }
        
        var exceedcount = atscount + 1;

        if (atscnt == exceedcount) {
            await driver.get('https://experian.taleo.net/careersection/sitemap.jss?portalCode=2&lang=pt_BR');
            await driver.sleep(2000);

            var urls = [];
            var totalJobElement = await driver.findElements(By.xpath('//*[contains(text(),"http")][@class="text"]'));
            var totalJobCount = await totalJobElement.length;
            // jobMaker.setatsJobCount(parseInt(totalJobCount));
            //var atscount = totalJobCount;
            //var atscnt = 1;

            for (var i = 0; i < totalJobCount; i++) {
                var url = await totalJobElement[i].getText();
                urls.push(url);
            }

            for (var j = 0; j < totalJobCount; j++) {
                try {
                    var job = jobMaker.create();
                    await driverjobdetails.get(urls[j]);
                    await driver.sleep(2000);
                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="editablesection"]'));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {
                        var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        job.JOB_APPLY_URL = "https://experian.taleo.net/careersection/2/jobapply.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                        var titleElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqTitleLinkAction.row1"]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var locationsElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1683.row1"]'));
                        var islocation = await locationsElement.length;
                        if (islocation) {
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1683.row1"]'));
                            var location = await locationElement.getText();

                            if (location) {
                                var loc = location.split("-");
                                if (loc.length == 3) {
                                    job.JOB_LOCATION_CITY = loc[2];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                                else if (loc.length == 2) {
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                                else if (loc.length == 4) {
                                    job.JOB_LOCATION_CITY = loc[2];
                                    job.JOB_LOCATION_STATE = loc[3];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                                else {
                                    job.JOB_LOCATION_COUNTRY = location;
                                }
                            }
                        }

                        var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1633.row1"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                        var relocationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1733.row1"]'));
                        var isrelocation = await relocationElement.length;
                        if (isrelocation) {
                            var relocation = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1733.row1"]'));
                            job.RELOCATION = await relocation.getText();
                        }



                        var scheduleElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1783.row1"]'));
                        var isschedule = await scheduleElement.length;
                        if (isschedule) {
                            var schedule = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1783.row1"]'));
                            job.JOB_TYPE = await schedule.getText();
                        }

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1478.row1"]'));
                        var desc1 = await descriptionElement.getAttribute("outerHTML");
                        var jobDescriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1534.row1"]'));
                        var desc2 = await jobDescriptionElement.getAttribute("outerHTML");
                        // var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID2978.row"]/td/div/div[3]'));
                        //var desc3 = await jobDescElement.getAttribute("outerHTML");

                        var jobDescription = '<span class=""> </span>' + desc1 + desc2 + '<span class=""> </span>';
                        
                        var optionsTag = {
                            'add-remove-tags': ['input', 'h1', 'h2', 'imagedata']
                        };

                        jobDescription = jobDescription.replace(/<tr/g, "<font");
                        jobDescription = jobDescription.replace(/<\/tr/g, "</font");
                        jobDescription = jobDescription.replace(/<td/g, "<font");
                        jobDescription = jobDescription.replace(/<\/td/g, "</font");
                        jobDescription = jobDescription.replace(/<th/g, "<font");
                        jobDescription = jobDescription.replace(/<\/th/g, "</font");
                        jobDescription = jobDescription.replace(/<tbody/g, "<font");
                        jobDescription = jobDescription.replace(/<\/tbody/g, "</font");
                        jobDescription = jobDescription.replace(/<span/g, "<font");
                        jobDescription = jobDescription.replace(/<\/span/g, "</font");
                        jobDescription = jobDescription.replace(/<div/g, "<font");
                        jobDescription = jobDescription.replace(/<\/div/g, "</font");


                        job.TEXT = HtmlEscape(jobDescription);

                    }
                    jobMaker.successful.add(job, botScheduleID);
                   
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                }
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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
