var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var cleanHtml = require('clean-html');
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

        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://opencarrieres.mua.hrdepartment.com/hr/ats/JobSearch/index');

        var searchElement = await driver.findElement(By.xpath("//*[@id='topmenu-collapse']//a[contains(@href, 'viewAll')]"));
        await searchElement.click();
        var pageElement = await driver.findElements(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr'));
        var count = pageElement.length;
        var lastPage = await driver.findElement(By.xpath('//*[@id="app_main_id"]//a[@class="paginateLast"][1]'));
        await lastPage.click();
        var recordCount = await driver.findElements(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr'));
        var records = recordCount.length;
        var pageCountURL = await driver.getCurrentUrl();
        var pageCount = pageCountURL.split("_page:")[1];
        var jobsCount = (((parseInt(pageCount) - 1) * parseInt(count)) + records);

        var searchElement = await driver.findElement(By.xpath("//*[@id='topmenu-collapse']//a[contains(@href, 'viewAll')]"));
        await searchElement.click();
        jobMaker.setatsJobCount(parseInt(jobsCount));


        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        var dateElement = await driver.findElement(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr[' + counter + ']/td[1]'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                        var relocationElement = await driver.findElement(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr[' + counter + ']/td[2]'));
                        job.RELOCATION = await relocationElement.getText();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="jobSearchResultsGrid_table"]/tbody/tr[' + counter + ']/td[3]/a'));
                        //var title = await titleElement.getText();

                        var urlData = await titleElement.getAttribute("href");
                        var idVal = undefined;
                        var url = undefined;

                        url = urlData.split("view/")[1];
                        if (url.includes("/")) {
                            idVal = url.split("/")[0];
                        } else {
                            idVal = url;
                        }

                        await driverjobdetails.get(urlData);
                        await driverjobdetails.sleep(2000);

                        while (run != "completed") {
                            try {

                                var titleDataElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_ats_requisition_title"]'));
                                job.JOB_TITLE = await titleDataElement.getText();

                                var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_ats_requisition_code"]'));
                                var jobid = await jobIdElement.getText();
                                if (jobid) {
                                    job.JDTID_UNIQUE_NUMBER = jobid.trim();
                                }

                                var categoryData = await driverjobdetails.findElements(By.xpath('//*[@id="job_details_ats_requisition_category_id"]'));
                                var isCatePresent = await categoryData.length;
                                if (isCatePresent) {
                                    var cateElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_ats_requisition_category_id"]'));
                                    job.JOB_CATEGORY = await cateElement.getText();
                                }

                                var qualificationData = await driverjobdetails.findElements(By.xpath('//*[@id="job_details_ats_requisition_level_id"]'));
                                var isQualificationPresent = await qualificationData.length;
                                if (isQualificationPresent) {
                                    var qualificationElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_ats_requisition_level_id"]'));
                                    job.QUALIFICATIONS = await qualificationElement.getText();
                                }

                                var typeData = await driverjobdetails.findElements(By.xpath('//*[@id="job_details_hua_job_type_id"]'));
                                var isTypePresent = await typeData.length;
                                if (isTypePresent) {
                                    var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_hua_job_type_id"]'));
                                    job.JOB_TYPE = await typeElement.getText();
                                }

                                var jobDescElement = await driverjobdetails.findElement(By.xpath("//fieldset[@class='form'][div[@class='form-group' and div[contains(text(), 'Description de poste')]]]"));
                                var jobDesc = await jobDescElement.getAttribute("outerHTML");

                                var jobDesc1Element = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and div[contains(text(), 'Description de poste')]]"));
                                var jobDesc1 = await jobDesc1Element.getAttribute("outerHTML");

                                var desc = undefined;
                                desc = jobDesc.split(jobDesc1)[1];
                                desc = jobDesc1 + desc;

                                desc = desc.replace("Description de poste", "");
                                job.TEXT = HtmlEscape(desc);

                                job.JOB_APPLY_URL = "https://opencarrieres.mua.hrdepartment.com/ats/apply_online.php?submittedFormId=apply_online_form&requisition_id=" + idVal + "&submit=R%C3%A9pondre+%C3%A0+cette+offre";
                                job.JOB_SALARY = "http://opencarrieres.mobolt.com/start_application?job_id=" + idVal;

                                jobMaker.successful.add(job, botScheduleID);

                                counter++;
                                run = "completed";

                            }
                            catch (ex) {
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
                var e = await driver.findElements(By.xpath("//ul[contains(@class, 'pagination')]/li[@class='paginateNext_div']/a"));
                if (e.length >= 1) {
                    var nextPage = await driver.findElement(By.xpath("//ul[contains(@class, 'pagination')]/li[@class='paginateNext_div']/a"));
                    await nextPage.click();
                    loop = true;
                }
            } catch (e) {
                var a = e.message;
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
    description = description.replace(/&mldr;+/g, "&hellip;");
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