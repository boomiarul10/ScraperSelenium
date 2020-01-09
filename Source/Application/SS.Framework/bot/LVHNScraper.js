var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var cleanHtml = require('clean-html');
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
    botScheduleID = configuration.scheduleid;
    var By = selenium.By;
    var until = selenium.until;
    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
    var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
    //await driver.manage().window().maximize();
    //await driverjobdetails.manage().window().maximize();
    var jobs = new Array();
    try {
        await driver.get('https://www.healthcaresource.com/lehighvalley/index.cfm?fuseaction=search.categoryList&template=dsp_job_categories.cfm');
        await driver.sleep(4000);
        var advancedsearchElement = await driver.findElement(By.xpath('//div[@id="panel3"]/div[@class="panel-heading"]//a'));
        await advancedsearchElement.click();
        await driver.sleep(2000);
        var searchElement = await driver.findElement(By.xpath("//div[@class='form-group']//button[@id='btnFtrSearch']"));
        await searchElement.click();
        var recordsElement = await driver.findElement(By.xpath("//div[@class='row']//div[@class='col-sm-12 text-center text-primary']"));
        var recordsCount = await recordsElement.getText();
        var record = recordsCount.split("of");
        record = record[1].split("Records");
        var atsjobcount = parseInt(record[0].trim());
        jobMaker.setatsJobCount(atsjobcount);
        await driver.navigate().back();
        var advancedsearchElement = await driver.findElement(By.xpath('//div[@id="panel3"]/div[@class="panel-heading"]//a'));
        await advancedsearchElement.click();
        var categoryElement = await driver.findElement(By.xpath('//div[@class="form-group"]//select[@id="iJobCatId"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));
        for (var i = 0; i < optionArray.length - 1; i++) {
            var categoryElement = await driver.findElement(By.xpath('//select[@id="iJobCatId"]'));
            var options = await categoryElement.findElements(By.tagName('option'));
            await options[0].click();
            await options[i + 1].click();
            var optValue = 2 + i;
            var option = await driver.findElement(By.xpath('//div[@class="form-group"]//select[@id="iJobCatId"]/option[' + optValue + ']'));
            var optionValue = await option.getAttribute('text');

            var searchElement = await driver.findElement(By.xpath("//div[@class='form-group']//button[@id='btnFtrSearch']"));
            await searchElement.click();
            var pagination = true;
            do {
                var tagElementxpath = '//*[@id="searchResultsForm"]/fieldset/div[4]/div';
                var isPresent = true;
                do {
                    try {
                        var job = jobMaker.create();
                        var jobElements = await driver.findElements(By.xpath(tagElementxpath + "/div[1]/div/div/div/div[4]/div"));
                        if (jobElements.length < 1)
                            isPresent = false;
                        if (isPresent) {
                            var locTagElementXpath1 = '/div[1]/div/div/div/div[5]/div';
                            var locTagElementXpath2 = '/div[1]/div/div/div/div[4]/div';
                            var isLocation = await driver.findElements(By.xpath(tagElementxpath + locTagElementXpath1));
                            var locationElement = '';
                            if (isLocation.length) {
                                locationElement = await driver.findElement(By.xpath(tagElementxpath + locTagElementXpath1));
                            } else {
                                locationElement = await driver.findElement(By.xpath(tagElementxpath + locTagElementXpath2));
                            }

                            var location = await locationElement.getAttribute('innerHTML');
                            if (location) {
                                var loc = location.split("<br>");
                                var loct = loc[1].split("</address>");
                                var locationValue = loct[0].split(",");
                                if (locationValue.length == 2) {
                                    job.JOB_LOCATION_STATE = locationValue[1];
                                    job.JOB_LOCATION_CITY = locationValue[0];
                                }
                                else {
                                    job.JOB_LOCATION_STATE = 'PA';
                                }
                            }

                            job.JOB_CATEGORY = optionValue;
                            var titleElement = await driver.findElement(By.xpath(tagElementxpath + '/div[1]/div/div/div/div[1]/div/h4/a'));
                            job.JOB_TITLE = await titleElement.getText();
                            var applyURL = await titleElement.getAttribute("href");
                            if (applyURL) {
                                var id = applyURL.split("JobId=");
                                var jobId = id[1].split("&");
                                job.JOB_APPLY_URL = "https://www.healthcaresource.com/lehighvalley/index.cfm?fuseaction=apply.login&template=dsp_apply_login.cfm&cJobId=" + parseInt(jobId[0]);
                            }

                            await driverjobdetails.get(applyURL);


                            var jobidElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Req. Number']]/div"));
                            job.JDTID_UNIQUE_NUMBER = await jobidElement.getText();

                            var jobindustryElements = await driverjobdetails.findElements(By.xpath("//div[@class='form-group' and .//label[text() = 'Department']]/div"));
                            var isJobIndustry = await jobindustryElements.length;
                            if (isJobIndustry) {
                                var jobindustryElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Department']]/div"));
                                job.JOB_INDUSTRY = await jobindustryElement.getText();
                            }

                            var jobstatusElements = await driverjobdetails.findElements(By.xpath("//div[@class='form-group' and .//label[text() = 'Schedule']]/div"));
                            var isStatus = await jobstatusElements.length;
                            if (isStatus) {
                                var jobstatusElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Schedule']]/div"));
                                job.JOB_STATUS = await jobstatusElement.getText();
                            }
                            var jobtypeElements = await driverjobdetails.findElements(By.xpath("//div[@class='form-group' and .//label[text() = 'Shift']]/div"));
                            var isJobType = await jobtypeElements.length;
                            if (isJobType) {
                                var jobtypeElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Shift']]/div"));
                                job.JOB_TYPE = await jobtypeElement.getText();
                            }
                            var jobworkinghoursElements = await driverjobdetails.findElements(By.xpath("//div[@class='form-group' and .//label[text() = 'Hours']]/div"));
                            var isJobHours = await jobworkinghoursElements.length;
                            if (isJobHours) {
                                var jobworkinghoursElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Hours']]/div"));
                                job.SALARYTIME = await jobworkinghoursElement.getText();
                            }
                            var jobdescElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group' and .//label[text() = 'Job Details']]"));
                            var desc = await jobdescElement.getAttribute('outerHTML');
                            if (desc) {
                                desc = desc.trim();
<<<<<<< HEAD
                                desc = desc.replace(/<\/p>/g, "<br/>");
                                desc = desc.replace(/<\/span>/g, "<br/>");
                                desc = desc.replace(/<br\/><br\/>/g, "<br/>");
=======
                                desc = desc.replace("</p>", "<br/>");
                                desc = desc.replace("</span>", "<br/>");
                                //desc = desc.replace("<br/><br/>", "<br/>");
>>>>>>> da7496dc1edfb55adfeb3ecdb7adf02ff799280b
                                desc = desc.replace('<b style="mso-bidi-font-weight: normal"> <br/></b>', '');
                            }

                            var jobdescription = "<b>Job ID:</b>" + job.JDTID_UNIQUE_NUMBER + "<br/><b>Schedule:</b>" + job.JOB_STATUS + "<br/><b>Shift:</b>" + job.JOB_TYPE + "<br/><b>Department:</b>" + job.JOB_INDUSTRY + "<br/><b>Hours:</b>" + job.SALARYTIME + "<br/><b>Location:</b>" + job.JOB_LOCATION_CITY + " " + job.JOB_LOCATION_STATE + "<br/><br/>" + desc;
                            var applyElement = await driverjobdetails.findElement(By.xpath("//div[@class='form-group']//div[@class='btn-group']/button[@class='btn btn-primary dropdown-toggle']"));
                            await applyElement.click();
                            var applynowElement = await driverjobdetails.findElement(By.xpath("//div[@class='col-sm-8']//ul[@class='dropdown-menu']//a[@data-target='.bs-external-modal-sm']"));
                            await applynowElement.click();
                            await driverjobdetails.sleep(2000);
                            var externalapplyElement = await driverjobdetails.findElement(By.xpath("//div[@class='modal-dialog modal-sm']//button[@id='externalApply']"));
                            await externalapplyElement.click();
                            var url = await driver.getCurrentUrl();

                            var jobText = "";
                            var optionsTag = {
                                'add-remove-tags': ['p', 'span', 'o:p']
                            };

                            cleanHtml.clean(jobdescription, optionsTag, function (html) {
                                jobText = html;
                            });

                            job.TEXT = HtmlEscape(jobText);
                            job.JOB_CONTACT_COMPANY = "Lehigh Valley Health Network";
                            jobMaker.successful.add(job, botScheduleID);
                        }
                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                    tagElementxpath = tagElementxpath + '/div[2]/div';

                } while (isPresent);
                var nextLinks = await driver.findElements(By.xpath("//*[@class='pagination pagination-sm']/li/a[i[@class='fa fa-caret-right']]"));

                if (nextLinks.length > 0) {
                    var nextLink = await driver.findElement(By.xpath("//*[@class='pagination pagination-sm']/li/a[i[@class='fa fa-caret-right']]"));
                    await nextLink.click();
                }
                else {
                    pagination = false;
                    var homePageElement = await driver.findElement(By.xpath('//div[@class="navbar navbar-default navbar-fixed-top"]/div/a'));
                    await homePageElement.click();
                    var advancedsearchElement = await driver.findElement(By.xpath('//div[@id="panel3"]/div[@class="panel-heading"]//a'));
                    await advancedsearchElement.click();
                }
            } while (pagination);
        }
    }
    catch (e) {
        console.log(e.message);
    }
    finally {
        await driver.quit();
        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&nbsp;/g, ' ');
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
