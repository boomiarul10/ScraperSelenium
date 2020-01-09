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

        await driver.get('https://unchealthcare.taleo.net/careersection/chatham_external/jobsearch.ftl?lang=en&amp;portal=10360750945');

        var jobCount = await driver.findElement(By.xpath('//*[@id="requisitionListInterface"]/div[2]'));
        var atsCount = await jobCount.getText();
        atsCount = atsCount.split('(');
        var count = atsCount[1].split('jobs');
        count = count[0].trim();
        jobMaker.setatsJobCount(parseInt(count));

        var categoryElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            do {
                var counter = 1;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']//*[@id="requisitionListInterface.ID3613.row' + counter + '"]//*[@class="titlelink"]/a'));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']//*[@id="requisitionListInterface.ID3815.row' + counter + '"]'));
                            var location = await locationElement.getText();
                            var typeElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']//*[@id="requisitionListInterface.ID3613.row' + counter + '"]//*[@class="jobtype"]'));
                            job.JOB_TYPE = await typeElement.getText();
                            var dateElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']//*[@id="requisitionListInterface.ID3887.row' + counter + '"]//span[contains(@id,"requisitionListInterface.reqPostingDate.row")]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();
                            if (location) {
                                location = location.replace("Location:", "");
                                var loc = location.split("-");
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            var idElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6694.row"][' + counter + ']//*[@id="requisitionListInterface.reqContestNumberValue.row' + counter + '"]'));
                            var jobId = await idElement.getText();
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.JOB_APPLY_URL = "https://unchealthcare.taleo.net/careersection/jobdetail.ftl?job=" + jobId + "&lang=en"
                            job.JOB_CATEGORY = category;
                            var jobDetailUrl = "https://unchealthcare.taleo.net/careersection/chatham_external/jobdetail.ftl?job=" + jobId + "&lang=en";
                            await driverjobdetails.get(jobDetailUrl);
                            await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="editablesection"]')), 10000);


                            var jobDetail = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                            if (jobDetail.length == 1) {

                                var jobDescription = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                                var description = await jobDescription.getAttribute("outerHTML");

                                if (description.includes("Employee Status")) {
                                    var status = description.split("Employee Status");
                                    var statusValue = status[1].split('title="">');
                                    job.JOB_STATUS = statusValue[1].replace("</span></div></div>", "");
                                }
                                job.TEXT = HtmlEscape(description);
                                jobMaker.successful.add(job, botScheduleID);
                            }
                            counter++;
                        }
                        catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);
                try {
                    var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4090.panel.Next"]/span[@class="pagerlink"]'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4090.Next"]'));
                        await nextLink.click();
                        loop = true;
                    }
                    else {
                        await driver.get('https://unchealthcare.taleo.net/careersection/chatham_external/jobsearch.ftl?lang=en&amp;portal=10360750945');
                    }
                }
                catch (e) {
                    var ex = e.message;
                }
            } while (loop);
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
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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