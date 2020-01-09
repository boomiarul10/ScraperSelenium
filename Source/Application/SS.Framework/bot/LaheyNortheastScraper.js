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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('https://jobs.lahey.org/psp/erecruit/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_CE.GBL?Page=HRS_CE_HM_PRE&Action=A&SiteId=100');
        //var dataa = await driver.getPageSource();
        await driver.switchTo().frame("TargetContent");

        await driver.findElement(By.xpath('//*[@id="HRS_APP_SRCHDRV_HRS_SEARCH_BTN"]')).click();

        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath('//*[@class="PABOLDTEXT"]')), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        while (run != "completed") {

                            var jobIdElement = await driver.findElement(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']/td[4]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                            var categoryElement = await driver.findElement(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']/td[5]'));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            var cityElement = await driver.findElement(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']/td[6]'));
                            var city = await cityElement.getText();
                            job.JOB_LOCATION_CITY = city;
                            if (city.indexOf(',') > 0) {
                                var loc = city.split(',');
                                city = loc[0];
                            }

                            var dateElement = await driver.findElement(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']/td[2]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var titleElement = await driver.findElement(By.xpath('//table[@class="PSLEVEL1GRIDNBO"]/tbody/tr[' + counter + ']/td[3]'));
                            job.JOB_TITLE = await titleElement.getText();

                            job.JOB_LOCATION_STATE = (city == "Derry") || (city == "Dover") || (city == "Nashua") || (city == "Portsmouth") || (city == "Rochester") || (city == "Salem") ? "NH" : "MA";

                            var url = "https://jobs.lahey.org/psp/erecruit/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_CE.GBL?Page=HRS_CE_JOB_DTL&Action=A&JobOpeningId=" + job.JDTID_UNIQUE_NUMBER + "&SiteId=100&PostingSeq=1";
                            job.JOB_APPLY_URL = url;

                            await driverjobdetails.get(url);
                            await driverjobdetails.switchTo().frame("TargetContent");

                            try {

                                var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="ACE_HRS_JO_PST_DSCR$0"]/tbody'));
                                var isDetailPage = await jobdetailspage.length;
                                if (isDetailPage) {

                                    var descElement = await driverjobdetails.findElement(By.xpath('//*[@id="ACE_HRS_JO_PST_DSCR$0"]/tbody'));
                                    var desc = await descElement.getAttribute("outerHTML");
                                    desc = desc.replace('Responsibilities</span>', '<br><b>Responsibilities</b><br><br>');
                                    desc = desc.replace('Qualifications</span>', '<br><b>Qualifications</b><br><br>');
                                    desc = desc.replace('Shift</span>', '<br><b>Shift</b><br><br>');
                                    desc = desc.replace('Job Description</span>', '<b>Job Description</b><br><br>');
                                    desc = desc.replace('Physical Requirements', '<br><b>Physical Requirements</b><br><br>');
                                    desc = desc.replace('Scheduled Hours', '&nbsp;Scheduled Hours&nbsp;');
                                    desc = desc.replace('How To Apply', '<br/><b>How To Apply</b><br><br>');
                                    desc = desc.replace('About Lahey Health', '<br/><b>About Lahey Health</b><br><br>');

                                    var optionsTag = {
                                        'add-remove-tags': ['tr', 'td', 'th', 'tbody', 'span', 'div']
                                    };

                                    cleanHtml.clean(desc, optionsTag, function (html) {
                                        desc = html;
                                    });

                                    job.JOB_CONTACT_COMPANY = "Lahey";
                                    job.JOB_LOCATION_COUNTRY = "US";

                                    var statusElements = await driverjobdetails.findElements(By.xpath('//*[@id="win0divHRS_CE_WRK2_HRS_FULL_PART_TIME$0"]/span'));
                                    if(statusElements.length > 0){
                                        var statusElement = await driverjobdetails.findElement(By.xpath('//*[@id="win0divHRS_CE_WRK2_HRS_FULL_PART_TIME$0"]/span'));
                                        job.JOB_STATUS = await statusElement.getText();                                   
                                    }
                                    if (desc) {
                                        job.TEXT = HtmlEscape(desc);
                                    }
                                }
                                jobMaker.successful.add(job, botScheduleID);
                                counter++;
                                run = "completed";

                            } catch (ex) {
                                if (run == "default") {
                                    run = "retry 1";
                                }
                                else if (run == "retry 1") {
                                    run = "retry 2";
                                }
                                else {
                                    run = "completed";
                                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, ex.message);
                                    counter++;
                                }
                            }
                        }
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);

            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@id="HRS_SCH_WRK_HRS_LST_NEXT"]'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="HRS_SCH_WRK_HRS_LST_NEXT"]'));
                    await nextLink.click();
                    await driver.sleep(5000);
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {
                var a = e.message;
            }
        } while (loop);
        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
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