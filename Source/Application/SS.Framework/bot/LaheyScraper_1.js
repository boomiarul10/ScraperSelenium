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

        await driver.get('http://www.lahey.org/Careers/Become_a_Lahey_Physician/Physician_Listings.aspx');
        var rssFeed = await driver.getPageSource();
        var loop;
        var jobID = 1;
        var pagecountvar = await driver.findElement(By.xpath("//span[@class='flatview']/a[last()]"));
        var pagecountData = await pagecountvar.getText();
        var pagecount = parseInt(pagecountData.trim());

        var jobDataCount = 0;
        var container1 = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;']"));
        var cont1FirstPageCount = await container1.length;
        var container2 = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][2]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;']"));
        var cont2FirstPageCount = await container2.length;
        jobDataCount = cont1FirstPageCount + cont2FirstPageCount;

        await pagecountvar.click();

        var lastPagecontainer1 = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;']"));
        var cont1LastPageCount = await lastPagecontainer1.length;
        var lastPagecontainer2 = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][2]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;']"));
        var cont2LastPageCount = await lastPagecontainer2.length;

        jobDataCount = jobDataCount + cont1LastPageCount + cont2LastPageCount;

        jobMaker.setatsJobCount(jobDataCount);

        await driver.get('http://www.lahey.org/Careers/Become_a_Lahey_Physician/Physician_Listings.aspx');

        var pagenumber = 0;
        do {
            loop = false;
            var counter1 = 1;

            do {
                var jobContainer1 = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter1 + "]"));
                var isPresent1 = await jobContainer1.length;
                if (isPresent1) {
                    try {
                        var job = jobMaker.create();
                        var titleElement1 = await driver.findElement(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter1 + "]/div/h2"));
                        job.JOB_TITLE = await titleElement1.getText();
                        job.JDTID_UNIQUE_NUMBER = jobID;
                        job.JOB_CATEGORY = "Physician";
                        job.JOB_LOCATION_STATE = "MA";
                        job.COMPANY_URL = "http://www.lahey.org/About_Lahey/Careers/Become_a_Lahey_Physician/Physician_Opportunities/Current_Available_Physician_Career_Opportunities.aspx";
                        job.JOB_CONTACT_COMPANY = "Lahey";


                        var urlContainer = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter1 + "]/div[3]/a"));
                        var isURLPresent = await urlContainer.length;
                        if (isURLPresent) {

                            var urlElement1 = await driver.findElement(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][1]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter1 + "]/div[3]/a"));
                            job.JOB_APPLY_URL = await urlElement1.getAttribute("href");

                            await driverjobdetails.get(job.JOB_APPLY_URL);

                            var dscContainer = await driverjobdetails.findElements(By.xpath('//*[@id="ctl01_leftContent_ctl00"]'));
                            var isDscPresent = await dscContainer.length;
                            if (isDscPresent) {

                                var JobDescription1 = await driverjobdetails.findElement(By.xpath('//*[@id="ctl01_leftContent_ctl00"]'));

                                var descrip1 = await JobDescription1.getAttribute("outerHTML");

                                if (descrip1) {
                                    descrip1 = descrip1.replace("<tr>", "<br>").replace("Job Description:", "Job Description:&nbsp;");

                                    var optionsTag = {
                                        'add-remove-tags': ['td', 'tbody', 'table']
                                    };

                                    cleanHtml.clean(descrip1, optionsTag, function (html) {
                                        descrip1 = html;
                                    });


                                    job.TEXT = HtmlEscape(descrip1);
                                }
                            }
                        }
                        counter1++;
                        jobMaker.successful.add(job, botScheduleID);
                        jobID++;
                    } catch (e) {
                    }
                }
            } while (isPresent1);



            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][2]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][2]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter + "]/div/h2"));
                        var title = await titleElement.getText();

                        if (title != null) {
                            var rex = /(.*)-.*/;
                            var rexPresent = rex.test(title);
                            if (rexPresent) {
                                var titleData = rex.exec(title);
                                job.JOB_TITLE = titleData[1];
                            } else {
                                job.JOB_TITLE = title;
                            }
                        
                            var titleSplit = title.split(",");
                            if (titleSplit.length > 1) {
                                job.JOB_LOCATION_CITY = titleSplit[titleSplit.length - 1];
                            }

                            rex.lastIndex = 0;
                        }

                        job.JDTID_UNIQUE_NUMBER = jobID;
                        job.JOB_CATEGORY = "Physician";
                        job.JOB_LOCATION_STATE = "MA";
                        job.COMPANY_URL = "http://www.lahey.org/About_Lahey/Careers/Become_a_Lahey_Physician/Physician_Opportunities/Current_Available_Physician_Career_Opportunities.aspx";
                        job.JOB_CONTACT_COMPANY = "Lahey";

                        var urlElement = await driver.findElement(By.xpath("//ul[@id='ctl00_ContentPlaceHolder1_DropZoneSectionTitle_columnDisplay_ctl00_column']/li[@class='PBItem'][2]//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;'][" + counter + "]/div/div/a"));
                        job.JOB_APPLY_URL = await urlElement.getAttribute("href");

                        await driverjobdetails.get(job.JOB_APPLY_URL);
                        var JobDescription = await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='pageLeftCol']")), 2000);

                        var descrip = await JobDescription.getAttribute("outerHTML");
                        if (descrip) {
                            descrip = descrip.replace("<tr>", "<br>").replace("Job Description:", "Job Description:&nbsp;");

                            var optionsTag = {
                                'add-remove-tags': ['td', 'tbody', 'table']
                            };

                            cleanHtml.clean(descrip, optionsTag, function (html) {
                                descrip = html;
                            });


                            job.TEXT = HtmlEscape(descrip);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                        jobID++;
                    } catch (e) {
                    }
                }
            } while (isPresent);

            try {
                pagenumber++;
                if (pagenumber == pagecount) {
                    loop = false;
                }
                else {
                    var nextContainer = await driver.findElements(By.xpath("//a[@rel='next']"));
                    var next = nextContainer.length;
                    if (next) {
                        var nextLink = await driver.findElement(By.xpath("//a[@rel='next']"));
                        await nextLink.click();
                        var jobElement = await driver.wait(until.elementLocated(By.xpath("//div[@class='featureLine virtualpage virtualpage1200 virtualpage'][@style='display: block;']")), 2000);
                        var isTitle = await jobElement.getText();
                        if (isTitle) {
                            loop = true;
                        }
                    }
                }
            } catch (e) {

            }
        } while (loop);
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
