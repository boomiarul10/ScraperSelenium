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

        await driver.get('https://rn21.ultipro.com/NOR1016/JobBoard/listjobs.aspx?Page=Browse&amp;__VT=ExtCan');

        var totalJobElement = await driver.findElement(By.xpath('//*[@id="PXForm"]/table[1]/tbody/tr/td/span[5]'));
        var totalJobCount = await totalJobElement.getText();
        jobMaker.setatsJobCount(parseInt(totalJobCount));

        do {
            loop = false;
            var counter = 2;
            do {

                var jobContainer = await driver.findElements(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var idElement = await driver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[1]'));
                        var jobId = await idElement.getText();
                        job.JDTID_UNIQUE_NUMBER = jobId.trim();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_LOCATION_COUNTRY = 'US';

                        var urlElement = await driver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]/a'));
                        var url = await urlElement.getAttribute("href");
                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="PXForm"]//table[@class="DetailsTable"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var cityElement = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_City"]/span'));
                            job.JOB_LOCATION_CITY = await cityElement.getText();

                            var stateElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_State"]/span'));
                            var isState = await stateElement.length;
                            if (isState) {
                                var state = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_State"]/span'));
                                job.JOB_LOCATION_STATE = await state.getText();
                            }
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_JobFamilyFK"]/span'));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            var typeElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_ReqUDF5FK"]/span'));
                            var isType = await typeElement.length;
                            if (isType) {
                                var type = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_ReqUDF5FK"]/span'));
                                job.JOB_TYPE = await type.getText();
                            }

                            var industryElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_OrgFK"]/span'));
                            var isIndustry = await industryElement.length;
                            if (isIndustry) {
                                var industry = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_OrgFK"]/span'));
                                job.JOB_INDUSTRY = await industry.getText();
                            }

                            var salaryElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_ReqUDF4FK"]/span'));
                            var isSalary = await salaryElement.length;
                            if (isSalary) {
                                var salary = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_ReqUDF4FK"]/span'));
                                job.JOB_SALARY = await salary.getText();
                            }

                            var salaryFromElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_ReqUDF8FK"]/span'));
                            var isSalaryFrom = await salaryFromElement.length;
                            if (isSalaryFrom) {
                                var salaryFrom = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_ReqUDF8FK"]/span'));
                                job.JOB_SALARY_FROM = await salaryFrom.getText();
                            }

                            var salaryTOElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_ReqUDF9FK"]/span'));
                            var isSalaryTo = await salaryTOElement.length;
                            if (isSalaryTo) {
                                var salaryTo = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_ReqUDF9FK"]/span'));
                                job.JOB_SALARY_TO = await salaryTo.getText();
                            }
                            var relocationElement = await driverjobdetails.findElements(By.xpath('//*[@id="DataCell_Req_ReqUDF1FK"]/span'));
                            var isRelocation = await relocationElement.length;
                            if (isRelocation) {
                                var relocation = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_ReqUDF1FK"]/span'));
                                job.RELOCATION = await relocation.getText();
                            }
                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_PostDate"]/span'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var urlElement = await driverjobdetails.findElement(By.xpath('//*[@id="PXForm"]/table[2]//a[@title="Apply On-line"]'));
                            job.JOB_APPLY_URL = await urlElement.getAttribute("href");

                            var jobEducation = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_Description"]'));
                            var desc1 = await jobEducation.getAttribute("outerHTML");

                            var jobRequirements = await driverjobdetails.findElement(By.xpath('//*[@id="Row_Req_Description"]'));
                            var desc2 = await jobRequirements.getAttribute("outerHTML");

                            var jobdesc = await driverjobdetails.findElement(By.xpath('//*[@id="Row_Req_Requirements"]'));
                            var desc3 = await jobdesc.getAttribute("outerHTML");

                            var additionalRequirements = await driverjobdetails.findElement(By.xpath('//*[@id="Row_Req_TextUDF2"]'));
                            var desc4 = await additionalRequirements.getAttribute("outerHTML");

                            var description = '<span class="PrintSmall">Description</span>' + desc1 + desc2 + desc3 + desc4 + '<td align="Left" class="LabelCell"><span class="PrintSmall"></span></td>';

                            job.TEXT = HtmlEscape(description);
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
                var nextContainer = await driver.findElements(By.xpath('//input[@value=" > "][@disabled="disabled"]'));
                var next = nextContainer.length;
                if (next == 0) {
                    var nextLink = await driver.findElement(By.xpath('//input[@value=" > "]'));
                    await nextLink.click();
                    loop = true;
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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
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