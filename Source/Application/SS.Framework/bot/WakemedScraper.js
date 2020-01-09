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

        await driver.get('http://careers.peopleclick.com/careerscp/client_wakemed/external/search.do?functionName=getSearchCriteria');
        var searchelement = await driver.findElement(By.xpath('//input[@id="searchButton"]'));
        await searchelement.click();
        var element = await driver.findElement(By.xpath('//*[@id="searchResultsHeaderTable"]/tbody/tr/td[1]'));
        var recordsValue = await element.getText();
        var record = recordsValue.split('of');
        record = record[1].split("(");
        await jobMaker.setatsJobCount(parseInt(record[0]));
        await driver.navigate().back();
        var locationElement = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]'));
        var optionArray = await locationElement.findElements(By.tagName('option'));
        var optionArrayData = await optionArray.shift();

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            var locationValue = optionValue;
            await option.click();
            driver.sleep(2000);
            var removeOption = i - 1;

            var optionAll = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + removeOption + ']'));
            await optionAll.click();
            await driver.sleep(2000);
            var searchelement = await driver.findElement(By.xpath('//input[@id="searchButton"]'));
            await searchelement.click();
            await driver.sleep(2000);

            var pagenumber = 1;
            do {
                loop = false;
                var counter = 2;
                do {
                    //await driver.wait(until.elementLocated(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td/a')), 7000);
                    var jobContainer = await driver.findElements(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td/a'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = await jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td/a'));
                            if (titleElement != null) {
                                var title = await titleElement.getText();
                            }

                            var jobIDElement = await driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[@class="pc-rtg-tableItem"][2]'));
                            if (jobIDElement != null) {
                                job.JDTID_UNIQUE_NUMBER = await jobIDElement.getText();
                            }

                            var dateElement = await driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[@class="pc-rtg-tableItem"][4]'));
                            if (dateElement != null) {
                                job.ASSIGNMENT_START_DATE = await dateElement.getText();
                            }
                            var url = await titleElement.getAttribute("href");

                            await driverjobdetails.get(url);

                            var elements = await driverjobdetails.findElements(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                            if (elements.length > 0) {
                                var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                                if (descriptionElement != null) {
                                    var description = await descriptionElement.getAttribute("innerHTML");
                                }

                                var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span"));
                                if (categoryElement != null) {
                                    var category = await categoryElement.getText();
                                    job.JOB_CATEGORY = category;
                                }

                                var contactElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[1]/td[2]/font/span"));
                                if (contactElement != null) {
                                    var contact = await contactElement.getText();
                                    job.JOB_CONTACT_COMPANY = contact;
                                }

                                var salaryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]/font/span"));
                                if (salaryElement != null) {
                                    var salary = await salaryElement.getText();
                                    job.JOB_SALARY = salary;
                                }

                                var statusElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]/font/span"));
                                if (statusElement != null) {
                                    var status = await statusElement.getText();
                                    job.JOB_STATUS = status;
                                }

                                var industryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[2]/font/span"));
                                if (industryElement != null) {
                                    var industry = await industryElement.getText();
                                    job.JOB_INDUSTRY = industry;
                                }                                                            

                                if (title != null) {
                                    var rex = /(.*)\s?-\s?\d+/;
                                    var rexPresent = rex.test(title);
                                    if (rexPresent) {
                                        var data = rex.exec(title);
                                        var titleRepl = title.replace(data[0], "");
                                        titleRepl = titleRepl.trim();
                                        if (titleRepl == "") {
                                            job.JOB_TITLE = data[1];
                                        } else {
                                            job.JOB_TITLE = data[1] + titleRepl;
                                        }

                                        
                                    } else {
                                        job.JOB_TITLE = title;
                                    }                                    
                                    rex.lastIndex = 0;
                                }

                                var jobDescription = await description.split("<table");
                                job.TEXT = await jobDescription[0].replace("Maximum Salary", "<br>Maximum Salary");
                                job.TEXT = await HtmlEscape(job.TEXT);

                                if (url != null) {
                                    var apply = await url.split("jobPostId=");
                                    var applyurl = await apply[1].split("&");
                                    job.JOB_TYPE = applyurl[0];
                                    job.JOB_APPLY_URL = await url.replace("jobDetails.do", "gateway.do").replace("getJobDetail", "viewFromLink");
                                }
                                if (locationValue != null) {
                                    var loc = await locationValue.split(",");
                                    job.JOB_LOCATION_CITY = loc[0];
                                    var state = await loc[1].split("(");
                                    job.JOB_LOCATION_STATE = await state[0].trim();
                                    job.JOB_LOCATION_COUNTRY = "US";
                                }
                                //var searchResultElement = await driver.findElement(By.xpath('//*[@id="searchResultLink"]'));
                                //await searchResultElement.click();
                                //await driver.wait(until.elementLocated(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td/a')), 3000);

                                await jobMaker.successful.add(job, botScheduleID);


                            } else {
                                var searchResultElement = await driver.findElement(By.xpath('//*[@id="searchResultLink"]'));
                                await searchResultElement.click();
                                await driver.sleep(6000);
                                await driver.wait(until.elementLocated(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td/a')), 3000);
                            }
                            counter++;
                        } catch (e) {
                            await jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);

                try {
                    var nextContainer = await driver.findElements(By.xpath('//input[@value=">"]'));
                    if (nextContainer.length == 2) {
                        var nextLink = await driver.findElement(By.xpath('//input[@value=">"]'));
                        await nextLink.click();
                        await driver.sleep(1000);
                        loop = true;
                        pagenumber++;
                    }
                } catch (e) {
                    e = e.message;
                }
            } while (loop);

            var searchResultElement = await driver.findElement(By.xpath('//*[@id="searchCriteriaLink"]'));
            await searchResultElement.click();
            await driver.sleep(6000);            
        }
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

 async function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = await description.replace(/&#9;/g, '');
    description = await description.replace(/&#x9;/g, '');
    description = await description.replace(/^\s+|\s+$/g, '');
    description = await description.replace(/\r?\n|\r/g, '');
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