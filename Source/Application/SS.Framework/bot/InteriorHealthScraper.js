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
        //var driver = selenium.createDriverWithCapabilties();
        //var driverjobdetails = selenium.createDriverWithCapabilties();      


        await driver.get('https://careers.roomtogrowbc.com/PostingSearch.aspx');
       
        await driver.executeScript("document.getElementById('ctl00_cphMaster_txtPostingID').setAttribute('value', '0')");

        var search = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_btnSearch"]'));
        await search.click();

        var jobCount = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_grdPostings_ctl01_lblTotalHeader"]'));
        var atsCount = await jobCount.getText();
        var atsJobCount = atsCount.split('positions');
        jobMaker.setatsJobCount(parseInt(atsJobCount[0]));
        await driver.navigate().back();

        var uniqueNumber = 0;
        var categoryElement = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_ddlCategory"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));        

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_ddlCategory"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_btnSearch"]'));
            await submitElement.click();
            var loop;
            var prime;
            do {
                loop = false;
                var jobContainer = await driver.findElements(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[2][@class='header']"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    prime = 3;
                }
                else {
                    prime = 2;
                }

                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[" + prime + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                            var titleElement = await driver.findElement(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[" + prime + "]/td[2]/a"));
                            var title = await titleElement.getText();
                            var idElement = await driver.findElement(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[" + prime + "]/td[1]"));
                            var jobId = await idElement.getText();
                            var cityElement = await driver.findElement(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[" + prime + "]/td[4]"));
                            var city = await cityElement.getText();
                            var stateElement = await driver.findElement(By.xpath("//*[@id='ctl00_cphMaster_grdPostings']/tbody/tr[" + prime + "]/td[3]"));
                            var state = await stateElement.getText();

                            var url = "http://careers.roomtogrowbc.com/ViewPosting.aspx?id=" + jobId;

                            await driverjobdetails.get(url);

                            var industryElement = await driverjobdetails.findElement(By.xpath("//*[@id='divContentContainer']/table[1]/tbody/tr[2]/td/table/tbody/tr[4]/td[2]"));
                            var industry = await industryElement.getText();
                            var jobType = await driverjobdetails.findElement(By.xpath("//*[@id='divContentContainer']/table[1]/tbody/tr[2]/td/table/tbody/tr[2]/td[2]"));
                            var type = await jobType.getText();
                            var communityElement = await driverjobdetails.findElement(By.xpath("//*[@id='divContentContainer']/table[1]/tbody/tr[1]/td[2]/table[2]/tbody/tr[1]/td[2]"));
                            var community = await communityElement.getText();
                            var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='divContentContainer']/table[2]"));
                            var description = await jobDescription.getAttribute("outerHTML");

                            uniqueNumber = jobId + "," + uniqueNumber;
                            var uniquenumberslist = uniqueNumber.split(',');
                            var out = "";
                            var counter = 0;
                            for (var j = 1; j < uniquenumberslist.length; j++) {
                                if (uniquenumberslist[j] == uniquenumberslist[0]) {
                                    counter++;
                                }
                            }
                            if (counter == 0) {
                                out = uniquenumberslist[0];
                            }
                            else {
                                out = uniquenumberslist[0] + "-" + counter;
                            }

                            title = title.replace('-', '–');
                            job.JOB_TITLE = titleCase(title);
                            job.JDTID_UNIQUE_NUMBER = out;
                            description = description.replace('<b>Qualifications</b>', '<br><br><b>Qualifications</b>');
                            var descriptionText = '<b>Job title</b> :' + title.toUpperCase() + '<br/> <b>Community</b> :' + community.toUpperCase() + '<br/> <b>Facility</b> :' + industry.toUpperCase() + '<br/> <b>Status</b> :' + type.toUpperCase() + '<br/>' + description;
                            job.TEXT = HtmlEscape(descriptionText);
                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = url;

                            job.JOB_LOCATION_CITY = city;
                            job.JOB_LOCATION_STATE = state;
                            job.JOB_LOCATION_COUNTRY = "Canada";

                            job.JOB_TYPE = type;
                            job.JOB_INDUSTRY = industry;
                            job.JOB_CONTACT_NAME = community;

                            jobMaker.successful.add(job, botScheduleID);
                            prime++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var pagerElement = await driver.findElements(By.xpath('//*[@id="ctl00_cphMaster_grdPostings_ctl01_btnPageNext"]'));
                    var pager = pagerElement.length;
                    if (pager) {
                        var HomeElement = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_grdPostings_ctl01_ddlPages"]/option[@selected="selected"]'));
                        var home = await HomeElement.getText();
                        var lastElement = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_grdPostings_ctl01_lblPageCount"]'));
                        var last = await lastElement.getText();
                        if (home < last) {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="ctl00_cphMaster_grdPostings_ctl01_btnPageNext"]'));
                            await nextLink.click();
                            loop = true;
                        } else {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="divHeaderMenu"]/table/tbody/tr/td[2]/a[2]'));
                            await nextLink.click();
                        }
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
    description = description.replace(/&mldr;+/g, "&hellip;");
    return description;
}
function titleCase(str) {
    words = str.toLowerCase().split(' ');
    for (var i = 0; i < words.length; i++) {
        var letters = words[i].split('');
        if (words[i].indexOf('–') >= 1) {
            var letter = words[i].split('–');
            letter[0] = letter[0].charAt(0).toUpperCase() + letter[0].slice(1);
            letter[1] = letter[1].charAt(0).toUpperCase() + letter[1].slice(1);
            words[i] = letter.join('–');
        }
        else if (letters[0] == "(" && letters.length >= 2) {
            letters[1] = letters[1].toUpperCase();
            words[i] = letters.join('');
        }
        else {
            letters[0] = letters[0].toUpperCase();
            words[i] = letters.join('');
        }
    }
    return words.join(' ');
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator");
    var snippet = await package.resource.download.snippet("feedgenerator");
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