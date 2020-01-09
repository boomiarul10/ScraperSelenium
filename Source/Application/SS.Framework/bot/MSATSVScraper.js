var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
var feed = require("feed-read");
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
        
        feed("https://atsv7.wcn.co.uk/search_engine/rss.cgi?rss_code=131", async function (err, jobsContent) {
            if (err) throw err;

            jobMaker.setatsJobCount(jobsContent.length);

            for (var item in jobsContent) {
                try {
                    var val = jobsContent[item];
                    var title = val.title;
                    var job = jobMaker.create();

                    if (title != "Head Office - Talent bank" || title == "Refer a friend Database") {

                        job.JOB_TITLE = title;
                        var url = val.link;
                        job.JOB_APPLY_URL = url;

                        await driver.get(url);
                        await driver.sleep(3000);
                        var jobURL = await driver.getCurrentUrl();
                        if (jobURL) {
                            if (jobURL.includes("SID=")) {
                                var jobURLData = jobURL.split("SID=").pop().split("#startcontent").shift();
                                var idURL = Buffer.from(jobURLData.toString(), 'base64').toString('ascii');
                                var jobid = idURL.split('&jcode=').pop().split('&').shift();
                                job.JDTID_UNIQUE_NUMBER = jobid;
                            } else if (jobURL.includes("&jcode=")){
                                var jobid = jobURL.split('&jcode=').pop().split('&').shift();
                                job.JDTID_UNIQUE_NUMBER = jobid;
                            }
                        }

                        var descElement = await driver.findElement(By.xpath("//*[@id='app_centre_text']//div[contains(div[@class = 'field_title'], 'Vacancy Details')]/div[2]"));
                        var descData = await descElement.getAttribute("outerHTML"); 

                        var descContent = val.content;

                        var locationCity = descContent.split("<location>").pop().split("</location>").shift();
                        job.JOB_LOCATION_CITY = locationCity;

                        var category = descContent.split("<expertise>").pop().split("</expertise>").shift().trim();
                        if (category == "" || category == "0") {
                            category = "Other";
                        }

                        var industry = descContent.split("<busarea>").pop().split("</busarea>").shift();
                        job.JOB_INDUSTRY = industry;

                        if (category == "Other" && industry == "Stores") {
                            category = "Retail Management";
                        }

                        job.JOB_CATEGORY = category;

                        job.JOB_LOCATION_COUNTRY = "United Kingdom";
                        var desc1 = descContent.replace("<BR>", "<br />").replace("<![CDATA[", "").replace("]]>", "").replace("<datelive>", "Date Live: ").replace("</datelive>", "<br />").replace("<vacancyclosing>", "Vacancy Closing: ").replace("</vacancyclosing>", "<br />").replace("<location>", "Location: ").replace("</location>", "<br />").replace("<salary>", "Salary: ").replace("</salary>", "<br />").replace("<busarea>", "Business Area: ").replace("</busarea>", "<br />").replace("<expertise>", "Area of Expertise: ").replace("</expertise>", "<br />").replace("<contract>", "Contract: ").replace("</contract>", "<br />").split("<jobdescription>").shift();
                        desc1 = desc1 + "Job Description<br />";
                        var desc = descData.replace("<BR>", "<br />").replace("<![CDATA[", "").replace("]]>", "").replace("<datelive>", "Date Live: ").replace("</datelive>", "<br />").replace("<vacancyclosing>", "Vacancy Closing: ").replace("</vacancyclosing>", "<br />").replace("<location>", "Location: ").replace("</location>", "<br />").replace("<salary>", "Salary: ").replace("</salary>", "<br />").replace("<busarea>", "Business Area: ").replace("</busarea>", "<br />").replace("<expertise>", "Area of Expertise: ").replace("</expertise>", "<br />").replace("<contract>", "Contract: ").replace("</contract>", "<br />").replace("<jobdescription>", "Job Description<br />").replace("</jobdescription>", "");
                        desc = HtmlEscape(desc);
                        desc = desc1 + desc;
                        
                        job.TEXT = desc;

                        jobMaker.successful.add(job, botScheduleID);

                    }
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                }
            }

            await driver.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);

        });      
        
    } catch (e) {
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