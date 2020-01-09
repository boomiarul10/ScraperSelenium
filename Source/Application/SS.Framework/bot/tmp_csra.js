var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

jobMaker.setAlertCount(30);
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

var core = (configuration, onsuccess, onfailure) => {
    botScheduleID = configuration.scheduleid;
    var By = selenium.By;
    var until = selenium.until;
    var async = require("async");
    var driver = selenium.createDriver("chrome");

    var jobs = new Array();
    var jobCount;

    driver.get('https://careers-sra.icims.com/jobs/search?ss=1&searchLocation=&searchCategory=&hashed=-435737597');
    driver.sleep(1000);
    driver.switchTo().frame("icims_content_iframe");
    driver.findElements(By.xpath('//*[@id="iCIMS_Paginator"]/option')).then(pageCount => {
        var count = pageCount.length;
        driver.findElement(By.xpath('//*[@id="iCIMS_Paginator"]/option[' + count + ']')).then(lastPage => {
            lastPage.click().then(() => {
                driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr')).then(recordCount => {
                    var records = recordCount.length;
                    var jobsCount = (((count - 1) * 20) + records);
                    driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]')).then(searchelement => {
                        searchelement.click().then(() => {
                            driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody')).then(e => {
                                return !!e.length;
                            }).then(data => {
                                if (data == true) {
                                    new Promise((onsuccess, onfailure) => {
                                        try {
                                            forEachTag(driver, By, until, jobs, async);
                                        } catch (e) {
                                            onfailure(e);
                                        }
                                    })
                                }
                            });
                        });
                    });
                });
            });
        });
    })
        .then(() => {
            driver.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
        }, err => {
            driver.quit();
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
            onfailure(output);
        });
}

function GetCount(jobList) {
    jobCount = new Array();
    for (var i = 1; i <= jobList.length; i++) {
        jobCount.push(i);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}


var forEachTag = (driver, By, until, jobs, async) => {
    driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            driver.sleep(1000);
            var job = jobMaker.create();
            if (prime >= 2) {
                driver.switchTo().frame("icims_content_iframe");
            }
            driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td[2]/a')).then(titleElement => {
                if (titleElement != null) {
                    titleElement.getText().then(title => {
                        driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td[1]')).then(jobIDElement => {
                            jobIDElement.getText().then(id => {
                                driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td[3]')).then(locationElement => {
                                    locationElement.getText().then(location => {
                                        driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td[4]')).then(typeElement => {
                                            typeElement.getText().then(type => {
                                                driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td[5]')).then(dateElement => {
                                                    dateElement.getText().then(date => {
                                                        titleElement.getAttribute("href").then(url => {
                                                            titleElement.click().then(() => {
                                                                driver.sleep(1000);
                                                                driver.findElement(By.xpath("//div[@class='iCIMS_JobContent']")).then(descriptionElement => {
                                                                    descriptionElement.getAttribute("outerHTML").then(description => {
                                                                        driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl[2]/dd")).then(categoryElement => {
                                                                            categoryElement.getText().then(category => {
                                                                                driver.navigate().back().then(() => {
                                                                                    job.JOB_TITLE = title;
                                                                                    job.JDTID_UNIQUE_NUMBER = id;
                                                                                    job.JOB_TYPE = type;
                                                                                    job.TEXT = HtmlEscape(description);
                                                                                    job.JOB_CATEGORY = category;
                                                                                    job.JOB_APPLY_URL = url;
                                                                                    job.ASSIGNMENT_START_DATE = date;
                                                                                    if (location != null) {
                                                                                        var loc = location.split("-");
                                                                                        if (loc.length == 2) {
                                                                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                                                                            job.JOB_LOCATION_STATE = loc[1];
                                                                                        }
                                                                                        else if (loc.length == 3) {
                                                                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                                                                            job.JOB_LOCATION_CITY = loc[2];
                                                                                            job.JOB_LOCATION_STATE = loc[1];
                                                                                        }
                                                                                        else if (loc.length == 1) {
                                                                                            job.JOB_LOCATION_COUNTRY = loc[0];                                                                                            
                                                                                        }
                                                                                    }
                                                                                    jobMaker.successful.add(job, botScheduleID);
                                                                                    callback(false);
                                                                                }).catch(e => { });
                                                                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                                        }).catch(e => { });
                                                                    }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                                }).catch(e => { });
                                                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                        }).catch(e => { });
                                                    }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                }).catch(e => { });
                                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                                        }).catch(e => { });
                                    }).catch(e => { failedJobCount = failedJobCount + 1 });
                                }).catch(e => { });
                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                        }).catch(e => { });
                    }).catch(e => { });
                }
            });
        }, function (err) {
            if (err) { throw err; }
        });
    }).then(() => {
        driver.switchTo().frame("icims_content_iframe");
        driver.findElements(By.xpath('//a[@target="_self"]/img[@alt="Next page of results"]')).then(e => {
            if (e.length == 1) {
                driver.findElement(By.xpath('//*[@target="_self"]/img[@alt="Next page of results"]')).then(nextPage => {
                    nextPage.click().then(() => {
                        forEachTag(driver, By, until, jobs, async);
                    });
                });
            }
        });
    });
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "writeObjectToFile").then(values => {
        var snippet = package.resource.download.snippet("writeObjectToFile");
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

