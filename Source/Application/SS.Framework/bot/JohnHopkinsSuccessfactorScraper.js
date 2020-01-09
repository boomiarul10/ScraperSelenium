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
        
        driver.manage().timeouts().implicitlyWait(60000);

        await driver.get('https://career4.successfactors.com/career?company=SFHUP&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&_s.crb=4NBz3mZRRSRunkulkuVDXcZbDns%3d');

        var countElement = await driver.findElement(By.xpath('//*[@class="filterJobCount"]/span'));
        var record = await countElement.getText();
        record = record.replace(',', '');
        jobMaker.setatsJobCount(parseInt(record));
        var jobcountElement = await driver.findElement(By.xpath('//*[@class="resultsHeaderPaginator"]//select/option[5]'));
        await jobcountElement.click();


        var loop;
        var prime;

        do {
            prime = 1;
            loop = false;
            do {
                var jobList = await driver.findElements(By.xpath('//tr[@class="jobResultItem"][' + prime + ']'));
                ispresent = jobList.length;
                if (ispresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath("//tr[@class='jobResultItem'][" + prime + "]/td[1]/div[1]/a"));
                        var title = await titleElement.getText();
                        var categoryElement = await driver.findElement(By.xpath("//tr[@class='jobResultItem'][" + prime + "]/td[1]/div[2]/div[1]"));
                        var category = await categoryElement.getText();
                        category = category.split(' - ');
                        category = category[2].trim();

                        var dateElement = await driver.findElement(By.xpath("//tr[@class='jobResultItem'][" + prime + "]/td[1]/div[2]/div[1]"));
                        var date = await dateElement.getText();
                        date = date.split(' - ');
                        date = date[1].trim();

                        var url = await titleElement.getAttribute("href");

                        await driverjobdetails.get(url);
                        var jobDetailsElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobAppPageTitle']/div[1]"));
                        var jobDetails = await jobDetailsElement.getText();
                        var description = await driverjobdetails.findElement(By.xpath("//*[@id='jobAppPageTitle']/div[4]/div/div")).getAttribute("outerHTML");
                        if (description.indexOf('Location:') > 0) {
                            description = description.split(/Location:.*<\/p>/g);
                            description = description[0] + "</span></p>" + description[1];
                        } else if (description.indexOf('LOCATION:') > 0) {
                            description = description.split(/LOCATION:.*<\/p>/g);
                            description = description[0] + "</span></p>" + description[1];
                        }

                        var details = jobDetails.split(' - ');
                        var id = details[0];
                        var company = details[3];
                        var status = details[4];
                        if (details.length == 9) {
                            var industry = details[5];
                            var jobtype = details[6];
                            var relocation = details[7];
                            var location = details[8];
                        } else if (details.length == 10) {
                            var industry = details[5] + ' - ' + details[6];
                            var jobtype = details[7];
                            var relocation = details[8];
                            var location = details[9];
                        } else if (details.length == 8) {
                            var company = details[2];
                            var status = details[3];
                            var industry = details[4];
                            var jobtype = details[5];
                            var relocation = details[6];
                            var location = details[7];
                        }
                        if (company != "Sleep Services of America" && company != "Johns Hopkins International" && company != "Johns Hopkins Resource Group" && company != "TCAS") {
                            job.JOB_TITLE = title;
                            job.JOB_CATEGORY = category.replace('Therapy (Physical, Occupational and o...', 'Therapy (Physical, Occupational and others)');
                            var jobid = id.split("Number");
                            job.JDTID_UNIQUE_NUMBER = jobid[1].trim();
                            job.JOB_APPLY_URL = url;
                            if (location != null) {
                                if (location.indexOf(',') < 1) {
                                    job.JOB_LOCATION_STATE = location;
                                }
                                else {
                                    var loc = location.split(',');
                                    job.JOB_LOCATION_CITY = loc[0];
                                    job.JOB_LOCATION_STATE = loc[1];
                                }
                            }
                            job.JOB_STATUS = status;
                            job.JOB_TYPE = jobtype;
                            job.RELOCATION = relocation;
                            job.JOB_CONTACT_COMPANY = company;
                            date = date.replace("Posted", "");
                            job.ASSIGNMENT_START_DATE = date;
                            job.JOB_INDUSTRY = industry
                            job.TEXT = HtmlEscape(description);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        prime++;
                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (ispresent);
            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@class="resultsHeaderPaginator"]//a[@title="Next Page"]'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//*[@class="resultsHeaderPaginator"]//a[@title="Next Page"]'));
                    await nextLink.click();
                    loop = true;
                }
            } catch (e) {

            }
        } while (loop);
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    }
    catch (err) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
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