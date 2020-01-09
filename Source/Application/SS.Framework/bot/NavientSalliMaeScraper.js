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

        await driver.get('https://www.candidatecare.com/srccsh/RTI.home?d=navient.candidatecare.com&amp;c=14');

        var lastPage = await driver.findElement(By.xpath('//*[@id="__searchButton_button"]'));
        await lastPage.click();
        var jobCount = await driver.findElement(By.xpath('//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[1]/td/table/tbody/tr/td/span[2]')).getText();
        var atsJobCount = jobCount.split('of');
        var totalJobCount = atsJobCount[1].split(" ");
        jobMaker.setatsJobCount(parseInt(totalJobCount[1]));

        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="_zzpostingCategory"]/span/select'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="_zzpostingCategory"]/span/select/Option[' + i + ']'));
            //var option = await driver.findElement(By.xpath('//*[@id="_zzpostingCategory"]/span/select/Option[5]'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="__searchButton_button"]'));
            await submitElement.click();

            var loop;
            do {
                var prime = 5;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[" + prime + "]/td[2]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var locationElement = await driver.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[" + prime + "]/td[3]"));
                            var location = await locationElement.getText();
                            var otherlocations = location + ';';
                            var locations = otherlocations.split(';');

                            for (var j = 0; j < locations.length; j++) {
                                var locationData = locations[j];
                                if (locationData.length > 1) {

                                    var job = jobMaker.create();
                                    var titleElement = await driver.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[" + prime + "]/td[2]//a"));
                                    var title = await titleElement.getText();
                                    var idElement = await driver.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[" + prime + "]/td[1]"));
                                    var jobId = await idElement.getText();
                                    var dateElement = await driver.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[" + prime + "]/td[4]//span"));
                                    var date = await dateElement.getText();

                                    var url = await titleElement.getAttribute("href");

                                    await driverjobdetails.get(url);

                                    var jobType = await driverjobdetails.findElement(By.xpath('//*[@id="typeOfFulltime"]'));
                                    var type = await jobType.getText();
                                    var jobDescription = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td/span/span/b[text()='Description']]"));
                                    var description = await jobDescription.getAttribute("innerHTML");
                                    var reqDescription = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td/span/span/b[text()='Requirements']]"));
                                    var requirements = await reqDescription.getAttribute("outerHTML");
                                    var EEODesc = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td[2]/span/span[starts-with(text(), 'EOE')]]"));
                                    var EEO = await EEODesc.getAttribute("outerHTML");
                                    var titleDescription = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td/span/span/b[text()='Type']] "));
                                    var titleDesc = await titleDescription.getAttribute("outerHTML");
                                    var locDescription = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td/span/span/b[text()='Location']]"));
                                    var locDesc = await locDescription.getAttribute("outerHTML");
                                    var dateDescription = await driverjobdetails.findElement(By.xpath("//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[2]/tbody/tr[td/span/span/b[text()='Date Posted']]"));
                                    var dateDesc = await dateDescription.getAttribute("outerHTML");

                                    job.JOB_TITLE = title;
                                    if (j >= 1) {
                                        jobId += '-' + j;
                                    }
                                    job.JDTID_UNIQUE_NUMBER = jobId;
                                    url = url.split('reqID=');
                                    var applyURLID = url[1].split('&x=');
                                    job.JOB_APPLY_URL = "https://www.candidatecare.com/srccsa/RTI.home?d=navient.candidatecare.com&r=" + applyURLID[0] + "&c=14";
                                    job.JOB_CATEGORY = category;
                                    job.ASSIGNMENT_START_DATE = date;
                                    if (locationData) {
                                        var loc = locationData.split(",");
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                    }
                                    var descriptionText = description + requirements + EEO + titleDesc + locDesc + dateDesc;
                                    descriptionText = descriptionText.replace(/<tr>/g, '').replace(/<\/tr>/g, '<br />').replace(/<td>/g, '').replace(/<\/td>/g, '');
                                    descriptionText += '<tr style=""> <td height="10" style="font-size:10px;"><span class="portal-cel" style="font-size:10px;"><img border="0" src="https://www.candidatecare.com/srccsh/public/com/airs/portal/taglib/resources/shim.gif.rez" height="10"></span> <br /> <input type="hidden" name="__sendbutton">';
                                    job.TEXT = HtmlEscape(descriptionText);
                                    job.JOB_TYPE = type;

                                    job.OTHER_LOCATIONS = location;
                                    jobMaker.successful.add(job, botScheduleID);
                                }
                            }
                            prime++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var HomeElement = await driver.findElements(By.xpath('//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[1]/td/table/tbody/tr/td/span[2]/a'));
                    var home = await HomeElement.length;

                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[3]/tbody/tr[1]/td/table/tbody/tr/td/span[2]/a[' + home + ']'));
                        var next = await nextLink.getText();
                        if (next == 'Next') {
                            await nextLink.click();
                            loop = true;
                        }
                        else {
                            var HomeLink = await driver.findElement(By.xpath('//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[1]/tbody/tr[1]/td[2]/span/span/a'));
                            await HomeLink.click();
                        }
                    }
                    else {
                        var nextLink = await driver.findElement(By.xpath('//form/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr[3]/td/table[1]/tbody/tr[1]/td[2]/span/span/a'));
                        await nextLink.click();
                    }
                }
                catch (e) {
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