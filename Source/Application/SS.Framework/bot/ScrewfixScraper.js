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
        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://kingfisher.taleo.net/careersection/3/jobsearch.ftl?lang=en&portal=2170451321');
        driver.sleep(5000);
        var dataa = await driver.getPageSource();
        var isJobTypePresent;
        var typeCounter = 1;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[@id='requisitionListInterface.searchResultHeaderId']//span")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        var categoryElement = await driver.findElement(By.xpath("//select[@name='jobfield1L1']"));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath("//select[@name='jobfield1L1']/Option[" + i + "]"));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.sleep(2000);

            var categoryElement2Data = await driver.findElements(By.xpath("//select[@name='jobfield1L2']"));

            if (categoryElement2Data.length > 0) {
                var categoryElement2 = await driver.findElement(By.xpath("//select[@name='jobfield1L2']"));
                var optionArray2 = await categoryElement2.findElements(By.tagName('option'));


                for (var j = 2; j <= optionArray2.length; j++) {
                    var option2 = await driver.findElement(By.xpath("//select[@name='jobfield1L2']/Option[" + j + "]"));
                    var category2 = await option2.getAttribute('text');
                    await option2.click();
                    var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                    await submitElement.click();
                    await driver.sleep(2000);
                    var loop;
                    var pagenumber = 1;
                    do {
                        loop = false;
                        var counter1 = 1;
                        do {
                            var jobContainer = await driver.findElements(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter1 + ']'));
                            var isPresent = await jobContainer.length;
                            if (isPresent) {
                                try {

                                    await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
                                    await driver.sleep(3000);
                                    var job = jobMaker.create();
                                    var run = "default";

                                    while (run != "completed") {

                                        var idElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter1 + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                        job.JOB_CATEGORY = category;
                                        job.TRAVEL = category2;

                                        var typeElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter1 + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqScheduleLabel.row')]"));
                                        job.JOB_TYPE = await typeElement.getText();

                                        var salaryElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter1 + "]//div[@class='editablesection']//div[.//span[starts-with(text(),'Salary Banding')]]"));
                                        var salaryData = await salaryElement.getText();

                                        if (salaryData) {
                                            job.JOB_SALARY = salaryData.replace("Salary Banding", "").trim();
                                        }

                                        var titleElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter1 + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                                        job.JOB_TITLE = await titleElement.getText();

                                        var url = "https://kingfisher.taleo.net/careersection/3/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;

                                        await driverjobdetails.get(url);

                                        try {

                                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                                            var isDetailPage = await jobdetailspage.length;
                                            if (isDetailPage) {

                                                var locationElements = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']/div[.//span[text()='Work Locations']]"));
                                                if (locationElements.length == 1) {
                                                    var locationElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']/div[.//span[text()='Work Locations']]"));
                                                    var locData = await locationElement.getText();

                                                    if (locData) {
                                                        job.JOB_LOCATION_COUNTRY = locData.replace("Work Locations :", "").trim();
                                                        if (job.JOB_LOCATION_COUNTRY.includes(",")) {
                                                            var cate = job.JOB_LOCATION_COUNTRY.split(',');
                                                            if (cate.length == 5) {
                                                                job.JOB_LOCATION_CITY = cate[3].trim();
                                                            }
                                                        }
                                                    }
                                                }

                                                var closingDateElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']/div[.//span[text()='Closing Date']]"));
                                                var closingDateData = await closingDateElement.getText();

                                                if (closingDateData) {
                                                    job.ASSIGNMENT_START_DATE = closingDateData.replace("Closing Date :", "").trim();
                                                }

                                                job.JOB_APPLY_URL = "https://kingfisher.taleo.net/careersection/3/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                                                job.JOB_LOCATION_COUNTRY = "United Kingdom";

                                                var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                                                var desc1 = await descElement.getAttribute("outerHTML");

                                                var descElement = await driverjobdetails.findElement(By.xpath("//div/div/form/div/div/div/div/div/div/table//div/div/table//div/div/h2/div/span[@class='subtitle']"));
                                                var desc0 = await descElement.getAttribute("outerHTML");

                                                var desc = desc1.split(desc0)[1];


                                                var jobDescription = "";

                                                if (desc) {
                                                    var optionTag = {
                                                        'add-remove-tags': ['div', 'span', 'font'],
                                                        'remove-attributes': [],
                                                        'remove-tags': []
                                                    };

                                                    cleanHtml.clean(desc, optionTag, function (html) {
                                                        jobDescription = html;
                                                    });

                                                    job.TEXT = HtmlEscape(jobDescription);
                                                }
                                                jobMaker.successful.add(job, botScheduleID);
                                            }
                                            counter1++;
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
                                                counter1++;
                                            }
                                        }
                                    }

                                }
                                catch (e) {
                                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                                    counter1++;
                                }
                            }
                        } while (isPresent);

                        try {
                            var noJobs = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.ID3468"][text()="No jobs match the specified criteria."]'));
                            var noJobsLen = noJobs.length;
                            if (noJobsLen < 1) {
                                var nextContainer = await driver.findElements(By.xpath("//span[@class='pagerlink']/a[contains(@id,'Next')]"));
                                var next = nextContainer.length;
                                if (next >= 1) {
                                    var nextLink = await driver.findElement(By.xpath("//span[@class='pagerlink']/a[contains(@id,'Next')]"));
                                    await nextLink.click();
                                    await driver.sleep(5000);
                                    loop = true;
                                    pagenumber++;
                                }
                            }
                        } catch (e) {
                            var a = e.message;
                        }

                    } while (loop);
                    var showCriteriaElem = await driver.findElements(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                    var showCriteriaPresent = showCriteriaElem.length;
                    if (showCriteriaPresent >= 1) {
                        var showCriteria = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                        await showCriteria.click();
                        await driver.sleep(2000);
                    }
                }

            } else {
                var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                await submitElement.click();
                await driver.sleep(2000);

                var loop;
                var pagenumber = 1;
                do {
                    loop = false;
                    var counter = 1;

                    do {


                        var jobContainer = await driver.findElements(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                        var isPresent = await jobContainer.length;
                        if (isPresent) {
                            try {

                                await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
                                await driver.sleep(3000);
                                var job = jobMaker.create();
                                var run = "default";

                                while (run != "completed") {

                                    var idElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                                    job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                    job.JOB_CATEGORY = category;

                                    var typeElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqScheduleLabel.row')]"));
                                    job.JOB_TYPE = await typeElement.getText();

                                    var salaryElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//div[.//span[starts-with(text(),'Salary Banding')]]"));
                                    var salaryData = await salaryElement.getText();

                                    if (salaryData) {
                                        job.JOB_SALARY = salaryData.replace("Salary Banding", "").trim();
                                    }

                                    var titleElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                                    job.JOB_TITLE = await titleElement.getText();

                                    var url = "https://kingfisher.taleo.net/careersection/3/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;

                                    await driverjobdetails.get(url);

                                    try {

                                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                                        var isDetailPage = await jobdetailspage.length;
                                        if (isDetailPage) {

                                            var locationElements = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']/div[.//span[text()='Work Locations']]"));
                                            if (locationElements.length == 1) {
                                                var locationElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']/div[.//span[text()='Work Locations']]"));
                                                var locData = await locationElement.getText();

                                                if (locData) {
                                                    job.JOB_LOCATION_COUNTRY = locData.replace("Work Locations :", "").trim();

                                                    if (job.JOB_LOCATION_COUNTRY.includes(",")) {
                                                        var cate = job.JOB_LOCATION_COUNTRY.split(',');
                                                        if (cate.length == 5) {
                                                            job.JOB_LOCATION_CITY = cate[3].trim();
                                                        }
                                                    }
                                                }
                                            }
                                            job.JOB_LOCATION_COUNTRY = "United Kingdom";
                                            var closingDateElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']/div[.//span[text()='Closing Date']]"));
                                            var closingDateData = await closingDateElement.getText();

                                            if (closingDateData) {
                                                job.ASSIGNMENT_START_DATE = closingDateData.replace("Closing Date :", "").trim();
                                            }

                                            job.JOB_APPLY_URL = "https://kingfisher.taleo.net/careersection/3/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                                            job.JOB_LOCATION_COUNTRY = "United Kingdom";
                                            var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                                            var desc1 = await descElement.getAttribute("outerHTML");

                                            var descElement = await driverjobdetails.findElement(By.xpath("//div/div/form/div/div/div/div/div/div/table//div/div/table//div/div/h2/div/span[@class='subtitle']"));
                                            var desc0 = await descElement.getAttribute("outerHTML");

                                            var desc = desc1.split(desc0)[1];
                                            var jobDescription = "";

                                            if (desc) {

                                                var optionTag = {
                                                    'add-remove-tags': ['div', 'span', 'font'],
                                                    'remove-attributes': [],
                                                    'remove-tags': []
                                                };

                                                cleanHtml.clean(desc, optionTag, function (html) {
                                                    jobDescription = html;
                                                });

                                                job.TEXT = HtmlEscape(jobDescription);
                                            }
                                            jobMaker.successful.add(job, botScheduleID);
                                        }
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
                        var noJobs = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.ID3468"][text()="No jobs match the specified criteria."]'));
                        var noJobsLen = noJobs.length;
                        if (noJobsLen < 1) {
                            var nextContainer = await driver.findElements(By.xpath("//span[@class='pagerlink']/a[contains(@id,'Next')]"));
                            var next = nextContainer.length;
                            if (next >= 1) {
                                var nextLink = await driver.findElement(By.xpath("//span[@class='pagerlink']/a[contains(@id,'Next')]"));
                                await nextLink.click();
                                await driver.sleep(5000);
                                loop = true;
                                pagenumber++;
                            }
                        }
                    } catch (e) {
                        var a = e.message;
                    }

                } while (loop);
                var showCriteriaElem = await driver.findElements(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                var showCriteriaPresent = showCriteriaElem.length;
                if (showCriteriaPresent >= 1) {
                    var showCriteria = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                    await showCriteria.click();
                    await driver.sleep(2000);
                }

            }


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

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
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
