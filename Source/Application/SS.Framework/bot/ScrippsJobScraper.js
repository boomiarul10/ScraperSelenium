var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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

        await driver.get('https://scripps.taleo.net/careersection/2/jobsearch.ftl?lang=en');
        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath('//*[@id="requisitionListInterface.ID3301"]')), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("(");
        jobMaker.setatsJobCount(parseInt(record[1].replace("jobs found)", "").trim()));


        var jobCountElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]'));

        var jobCountOptions = await jobCountElement.findElements(By.tagName('option'));
        await jobCountOptions[jobCountOptions.length - 1].click();

        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.reqTitleLinkAction.row' + counter + '"]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqTitleLinkAction.row' + counter + '"]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqContestNumberValue.row' + counter + '"]'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();


                        var locationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqBasicLocation.row' + counter + '"]'));
                        var location = await locationElement.getText();

                        if (location) {
                            if (location.includes("-")) {
                                var loc = location.split("-");
                                if (loc.length > 1) {
                                    job.JOB_LOCATION_CITY = loc[1];
                                    job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY.replace("County", "");
                                }
                            }
                        }
                        job.JOB_LOCATION_COUNTRY = "US";
                        job.JOB_LOCATION_STATE = 'California';

                        var OrganizationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqOrganization.row' + counter + '"]'));
                        job.JOB_CONTACT_COMPANY = await OrganizationElement.getText();

                        job.JOB_APPLY_URL = 'https://scripps.taleo.net/careersection/iam/accessmanagement/login.jsf?lang=en&redirectionURI=https%3A%2F%2Fscripps.taleo.net%2Fcareersection%2Fapplication.jss%3Flang%3Den%26type%3D1%26csNo%3D2%26portal%3D101430233%26reqNo%3D19961&TARGET=https%3A%2F%2Fscripps.taleo.net%2Fcareersection%2Fapplication.jss%3Flang%3Den%26type%3D1%26csNo%3D2%26portal%3D101430233%26reqNo%3D19961';

                        var url = 'https://scripps.taleo.net/careersection/2/jobdetail.ftl?job=' + job.JDTID_UNIQUE_NUMBER;
                        await driverjobdetails.get(url);

                        var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1741.row1"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();
                        job.JOB_TYPE = job.JOB_CATEGORY;


                        var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID3219.row"]/td/div'));
                        var desc = await JobDescription.getAttribute("outerHTML");
                        var JobDescriptionFirst = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1574.row1"]'));
                        var desc1 = await JobDescriptionFirst.getAttribute("outerHTML");
                        var JobDescriptionSecond = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.buttongrouppanelBottom.row1"]'));
                        var desc2 = await JobDescriptionSecond.getAttribute("outerHTML");
                        var description = desc1 + desc.split(desc1)[1];
                        job.TEXT = description.split(desc2)[0];
                        if (job.TEXT) {
                            var optionsTag = {
                                'add-remove-tags': ['p', 'h2', 'span', 'div']
                            };
                            cleanHtml.clean(job.TEXT, optionsTag, function (html) {
                                job.TEXT = html;
                            });
                            job.TEXT = job.TEXT.replace("/Experience/Specialized Skills:/g", "</br>Experience/Specialized Skills:");
                            job.TEXT = job.TEXT.replace("/Job:/g", "<br/><br/><b>Job:</b>");
                            job.TEXT = job.TEXT.replace("/Primary Location:/g", "<br/><br/><b>Primary Location:</b>");
                            job.TEXT = job.TEXT.replace("/Organization:/g", "<br/><br/><b>Organization:</b>");
                            job.TEXT = job.TEXT.replace("/Job Posting :/g", "<br/><br/><b>Job Posting :</b>");
                            job.TEXT = job.TEXT.replace("/Benefit Status:/g", "<br/><br/><b>Benefit Status:</b>");
                            job.TEXT = job.TEXT.replace("/Description/g", "<br/><br/><b>  Description </b><br/><br/>");
                            job.TEXT = job.TEXT.replace("/Qualifications/g", "<br/><br/><b>Qualifications </b><br/><br/>");
                            job.TEXT = job.TEXT.replace("/Job <br/><br/><b>  Description </b><br/><br/>-/g", "Job Description -");
                            job.TEXT = job.TEXT.replace("/Job <br/><br/><b>  Description </b><br/><br/></h1>/g", "<h1>Job Description </h1>");
                            job.TEXT = HtmlEscape(job.TEXT);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);

            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4046.panel.Next"]/span[@class="pagerlinkoff"]'));
                var next = nextContainer.length;
                if (!(next)) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4046.Next"]'));
                    await nextLink.click();
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {

            }
        } while (loop);
        driver.quit();
        driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
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
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgeneratorwithasync");
    var snippet = await package.resource.download.snippet("feedgeneratorwithasync");
    var input = await snippet.createInput(configuration, jobs);

    var jobcount = await snippet.execute(input);
    try {
        var output = await package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (err) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}
