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
       
        await driver.get('https://www.cedars-sinaimedicalcenter.apply2jobs.com/ProfExt/index.cfm?fuseaction=mExternal.searchJobs');
        
        var jobCountElement = await driver.findElement(By.xpath('//*[@id="VEPaging"]/table/tbody/tr/td[contains(text(),"Displaying")]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("of");
        var atsJobCount = jobCount[1].split("Search");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0].trim()));
        var nextPageCount = atsJobCount[0].trim() / 10 + 1;
        var nextPageCountValue = Math.trunc(nextPageCount);
        var nextCounter = 1;
        var loop;
        do {
            loop = false;
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + '] '));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td/a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var categoryElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[3]'));
                        job.JOB_CATEGORY = await categoryElement.getText();
                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[2]'));
                        var jobID = await jobIdElement.getText();
                        job.JDTID_UNIQUE_NUMBER = jobID.trim();                    
                        var typeElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[5]'));
                        job.JOB_TYPE = await typeElement.getText();
                        var industry = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[8]')).getText();
                        job.JOB_INDUSTRY = industry;
                        var status = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[4]')).getText();
                        job.JOB_STATUS = status;
                                                                                                var shiftlength = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[6]')).getText();
                        job.SALARYTIME = shiftlength;

                        var shifttype = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[7]')).getText();
                        job.TRAVEL = shifttype;
                        var locationStateElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[9]'));
                        job.JOB_LOCATION_STATE = await locationStateElement.getText();
                        var locationCityElement = await driver.findElement(By.xpath('//*[@id="VESearchResults"]/table/tbody/tr[' + counter + ']/td[10]'));
                        job.JOB_LOCATION_CITY = await locationCityElement.getAttribute("innerHTML");
                        job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY.replace('&nbsp;', '');
                        var url = await titleElement.getAttribute('href');
                        //job.JOB_APPLY_URL = url;
                        await driverjobdetails.get(url);
                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="JobDetailTable"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                                                                                                var costcenter = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[4]')).getText();
                            var costcntr = await costcenter.split("Cost Center # - Cost Center Name:");
                            job.JOB_CONTACT_COMPANY = costcntr[1];

                            var hours = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[10]')).getText();
                            var hrs = await hours.split("Hours:");
                            job.JOB_SALARY = hrs[1];

                            var daysElem = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[11]')).getText();
                            var days = await daysElem.split("Days:");
                            job.JOB_SALARY_FROM = days[1];

                            var weekend = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[13]')).getText();
                            var weekends = await weekend.split("Weekends:");
                            job.JOB_SALARY_TO = weekends[1];
                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[14]'));
                            var description = await descriptionElement.getAttribute("outerHTML");

                            var qualificationElement = await driverjobdetails.findElement(By.xpath('//*[@class="JobDetailTable"]//tr[15]'));
                            var qualification = await qualificationElement.getAttribute("outerHTML");
                            
                            if(url)
                            {
                                var appurl = url.replace("showJob","showLogin");
                                 appurl = appurl.replace("&CurrentPage=1"," ");
                                job.JOB_APPLY_URL = appurl;
                            }

                            job.TEXT = HtmlEscape(description);
                            job.QUALIFICATIONS = HtmlEscape(qualification);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                if (nextCounter < nextPageCountValue) {
                    if (nextCounter == 1) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="VEPaging"]/table/tbody/tr[2]/td/a[10]'));
                        await nextLink.click();
                    }
                    else {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="VEPaging"]/table/tbody/tr[2]/td/a[12]'));
                        await nextLink.click();
                    }
                    nextCounter++;                    
                    loop = true;
                }
            } catch (e) {
                var ex = e.message;
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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
    description = description.replace(/&#xfffd;+/g, "")
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
