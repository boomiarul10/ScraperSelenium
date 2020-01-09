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

        await driver.get('http://cvhp.jobscience.com/JsrApp/index.cfm?prodApp=cc153c84-af0b-4f17-a32a-75aec3b65159');

        var search = await driver.findElement(By.xpath('//*[@id="content"]/div/form/table/tbody/tr[6]/td[1]/input[@type="submit"]'));
        await search.click();

        var jobCount = await driver.findElement(By.xpath('//span[@class="searchTitle-results"]')).getText();
        var atsJobCount = await jobCount.split('of');
        jobMaker.setatsJobCount(parseInt(atsJobCount[1]));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//select[@name="fCode"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@name="fCode"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="content"]/div/form/table/tbody/tr[6]/td[1]/input[@type="submit"]'));
            await submitElement.click();

            var loop;
            do {
                loop = false;
                var counter = 2;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@class='centerbox-results']/form/table/tbody/tr[" + counter + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath("//*[@class='centerbox-results']/form/table/tbody/tr[" + counter + "]/td[3]/a"));
                            var title = await titleElement.getText();
                            var idElement = await driver.findElement(By.xpath("//*[@class='centerbox-results']/form/table/tbody/tr[" + counter + "]/td[2]"));
                            var jobId = await idElement.getText();
                            var statusElement = await driver.findElement(By.xpath("//*[@class='centerbox-results']/form/table/tbody/tr[" + counter + "]/td[4]"));
                            var status = await statusElement.getText();

                            await titleElement.click();
                            var locationElement = await driver.findElement(By.xpath("//*[@id='content2Column']/div/table[1]/tbody/tr[4]/td[2]/span"));
                            var location = await locationElement.getText();

                            var companyName = await driver.findElement(By.xpath('//*[@id="content2Column"]/div/table'));
                            var company = await companyName.getText();
                            var jobCompany = [];
                            var date = "";
                            if (company.includes("Campus/Location:")) {
                                var cmp = company.split("Campus/Location:");
                                jobCompany = cmp[1].split("Note");
                            }
                            else {
                                jobCompany[0] = "";
                            }

                            if (company.includes("Date Posted:")) {
                                var jobDate = company.split("Date Posted:");
                                date = jobDate[1].split(" Years Experience:");
                            }
                            var jobType = await driver.findElement(By.xpath("//*[@id='content2Column']/div/table[1]/tbody/tr[3]/td[2]/span"));
                            var type = await jobType.getText();
                            var jobDescription = await driver.findElement(By.xpath("//*[@id='content2Column']/div"));
                            var description = await jobDescription.getAttribute("outerHTML");
                            var removeElement = await driver.findElement(By.xpath("//*[@id='content2Column']/div/h3/span[1]/a"));
                            var element = await removeElement.getAttribute("outerHTML");
                            var applyURLElement = await driver.findElement(By.xpath("//*[@id='content2Column']/div/table[2]/tbody/tr[4]/td/input"));
                            await applyURLElement.click();
                            var applyURL = await driver.getCurrentUrl();
                            await driver.navigate().back();

                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.JOB_STATUS = status;

                            var desc = description.split('<input type="hidden" name="cmd" value="">');
                            var descriptionText = desc[0].split(element);
                            description = descriptionText[0] + descriptionText[1] + '</form></div>';
                            job.TEXT = HtmlEscape(description);

                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = applyURL;
                            job.JOB_TYPE = type;
                            if (location) {
                                var loc = location.split(",");
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[2];
                            }

                            job.ASSIGNMENT_START_DATE = formatDate(date[0].trim()) + ' 00:00:00.0';
                            job.JOB_CONTACT_COMPANY = jobCompany[0].trim();
                            job.COMPANY_URL = "http://cvhp.jobscience.com/JsrApp/index.cfm?prodApp=cc153c84-af0b-4f17-a32a-75aec3b65159";

                            jobMaker.successful.add(job, botScheduleID);
                            counter++;
                            await driver.navigate().back();
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);
                try {
                    var HomeElement = await driver.findElements(By.xpath('//*[@id="content2Column"]/div/form/h3[1]/span[1]/a'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextElement = await driver.findElement(By.xpath('//*[@id="content2Column"]/div/form/h3[1]/span[1]/a'));
                        var next = await nextElement.getText();
                        if (next == "Next »") {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="content2Column"]/div/form/h3[1]/span[1]/a'));
                            await nextLink.click();
                            loop = true;
                        }
                        else {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="navlist"]/li[1]/a'));
                            await nextLink.click();
                        }
                    }
                    else {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="navlist"]/li[1]/a'));
                        await nextLink.click();
                    }
                }
                catch (e) { }
            } while (loop);
        }
        driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
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
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
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