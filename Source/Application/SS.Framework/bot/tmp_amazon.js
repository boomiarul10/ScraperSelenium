var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var cleanHtml = require('clean-html');
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
        var driver = selenium.createDriver("chrome");
        var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('https://amazon.force.com/?setlang=en_US');

        var jobCount = await driver.findElements(By.xpath('//*[@class="listing row"]'));
        var atsJobCount = await jobCount.length;
        jobMaker.setatsJobCount(parseInt(atsJobCount));

        var search = await driver.findElement(By.xpath('//*[@id="accordion"]/div/div[1]/h4/a'));
        await search.click();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="search-container"]/div/div[1]/div[1]'));
        var optionArray = await categoryElement.findElements(By.tagName('div'));

        for (var i = 1; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="search-container"]/div/div[1]/div[1]/div[' + i + ']/label'));
            var category = await option.getText();
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@class="btn btn-gold"]'));
            await submitElement.click();
            await driver.sleep(2000);

            var prime = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//*[@class='search-results']/div[@class='listing row'][" + prime + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var locationElement = await driver.findElement(By.xpath("//*[@class='search-results']/div[@class='listing row'][" + prime + "]//div[1]/h6/span"));
                        var location = await locationElement.getText();
                        var urlTagElement = await driver.findElement(By.xpath("//*[@class='search-results']/div[@class='listing row'][" + prime + "]//div[1]/h6/a"));
                        var urlTag = await urlTagElement.getAttribute("href");

                        var urlId = urlTag.split("reqid=");
                        urlId = urlId[1].split("&");
                        urlId = urlId[0];

                        var url = "https://amazon.force.com/JobDetails?isapply=1&reqid=" + urlId;

                        await driverjobdetails.get(urlTag);

                        var titleElement = await driverjobdetails.findElement(By.xpath("//*[@class='title']"));
                        var title = await titleElement.getText();
                        var locElement = await driverjobdetails.findElement(By.xpath("//*[@class='details-line']"));
                        var loc = await locElement.getText();
                        var jobId = loc.split('|')[0].replace('Job ID: ', '');
                        var jobDescription = await driverjobdetails.findElement(By.xpath("//div[@class='col-sm-12']"));
                        var description = await jobDescription.getAttribute("outerHTML");

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobId.trim();
                        if (location) {
                            var loc = location.split(", ");
                            job.JOB_LOCATION_CITY = loc[0];

                            //if (loc[1].indexOf(" ") > 1) {
                            var loc1 = loc[1].split(" ");
                            if (loc1.length > 2) {
                                job.JOB_LOCATION_COUNTRY = loc1[1] + " " + loc1[2];
                                job.JOB_LOCATION_STATE = loc1[0];
                            }
                            else {
                                if (loc[1].indexOf("Germany") > 0 || loc[1].indexOf("Canada") > 0) {
                                    var loc2 = loc[1].split(" ");
                                    job.JOB_LOCATION_COUNTRY = loc2[1];
                                    job.JOB_LOCATION_STATE = loc2[0];
                                }
                                else {
                                    job.JOB_LOCATION_COUNTRY = loc[1];
                                }
                            }
                        }
                        //'<h1>' + title + '</h1> <div class="details-line"> <p>' + loc + '</p> </div>' + 
                        //var descriptionText = HtmlEscape(description);
                        //descriptionText += '<input type="hidden" name="j_id0:portId:j_id72" value="j_id0:portId:j_id72"><span id="j_id0:portId:j_id72:j_id73"><input type="submit" name="j_id0:portId:j_id72:j_id74" class="btn-bs btn-default" value="Apply"></span>';
                        var jobDescription = "";
                        var optionTag = {
                            'add-remove-tags': ['script'],
                            'remove-attributes': [],
                            'remove-tags': []
                        };

                        cleanHtml.clean(description, optionTag, function (html) {
                            jobDescription = html;
                        });
                        job.TEXT = HtmlEscape(jobDescription);
                        //job.TEXT = descriptionText;
                        job.JOB_CATEGORY = category;
                        job.JOB_APPLY_URL = url;

                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (isPresent);
            await option.click();
        }
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
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
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "Feed Generator").then(values => {
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