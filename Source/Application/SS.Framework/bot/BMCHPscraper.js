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


        await driver.get('https://bmchp.silkroad.com/epostings/');

        var search = await driver.findElement(By.xpath('//button[@id="Search"]'));
        await search.click();

        var jobCount = await driver.findElement(By.xpath('//*[@class="cssSearchResultsHead"]/span'));
        var atsJobCount = await jobCount.getText();
        jobMaker.setatsJobCount(parseInt(atsJobCount));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="byCat"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@id="byCat"]/Option[' + i + ']'));
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
                        var skills, experience;

                        var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='jobDesciptionDiv']"));
                        var description = await jobDescription.getAttribute("outerHTML");
                        var jobSkills = await driverjobdetails.findElements(By.xpath("//*[@id='jobRequiredSkillsDiv']"));
                        if (jobSkills.length == 1) {
                            var jobSkills = await driverjobdetails.findElement(By.xpath("//*[@id='jobRequiredSkillsDiv']"));
                            skills = await jobSkills.getAttribute("outerHTML");
                        } else { skills = null }
                        var jobExperience = await driverjobdetails.findElements(By.xpath("//*[@id='jobExperienceRqdDiv']"));
                        if (jobExperience.length == 1) {
                            var jobExperience = await driverjobdetails.findElement(By.xpath("//*[@id='jobExperienceRqdDiv']"));
                            experience = await jobExperience.getAttribute("outerHTML");
                        } else { experience = null; }

                        var jobType = await driverjobdetails.findElement(By.xpath("//*[@id='translatedJobPostingTypeDiv']"));
                        var type = await jobType.getText();

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobId;
                        //description = description.replace('<tr>', '').replace('>td>', '').replace('<tbody>', '');
                        if (skills != null) {
                            var descriptionText = '<dt id="dspJobTxtDescDiv" class="cssDspJobHead"><B><H2>Job Description</B></H2></dt>' + HtmlEscape(description) + '<dt id="dspJobTxtReqSkillsDiv" class="cssDspJobHead">Required Skills</dt>' + HtmlEscape(skills);
                            if (experience != null) {
                                descriptionText += '<dt id="dspJobTxtReqExpDiv" class="cssDspJobHead">Required Experience</dt>' + HtmlEscape(experience);
                            }
                        } else {
                            var descriptionText = '<dt id="dspJobTxtDescDiv" class="cssDspJobHead"><B><H2>Job Description</B></H2></dt>' + HtmlEscape(description);
                        }
                        job.TEXT = descriptionText;
                        job.JOB_CATEGORY = category;
                        url = url.replace('36332%2C', '');
                        job.JOB_APPLY_URL = url;
                        job.JOB_TYPE = type;
                        if (location) {
                            var loc = location.split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                            job.JOB_LOCATION_COUNTRY = loc[2];
                        }
                        job.JOB_CONTACT_COMPANY = "BMC";
                        job.COMPANY_URL = "https://bmchp.silkroad.com/epostings/";

                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    } catch (e) {
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
        driverjobdetails.quit();
        driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driverjobdetails.quit();
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