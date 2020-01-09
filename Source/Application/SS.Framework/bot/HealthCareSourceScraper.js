var Promise = require('promise');
var package = global.createPackage();

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(1);
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
    var categoryCount;

    function GetCategoryCount(optionArray) {
        categoryCount = new Array();
        for (var i = 2; i <= optionArray.length; i++) {
            categoryCount.push(i);
        }
    }

    driver.get('https://www.healthcaresource.com/thregion2/index.cfm?fuseaction=search.categoryList&template=dsp_job_categories.cfm&acct=mchs');
    driver.findElement(By.xpath('//*[@id="categories"]/div[2]/input[4]')).then(searchElement => {
        searchElement.click().then(() => {
            driver.findElement(By.xpath("//*[@id='jobListSummary']/div[2]")).then(recordsElement => {
                recordsElement.getText().then(recordsCount => {
                    var record = recordsCount.split("of");
                    record = record[1].split("Records");
                    jobMaker.setatsJobCount(parseInt(record[0]));
                    driver.navigate().back().then(() => {
                        driver.findElement(By.xpath('//*[@id="iJobCatId"]')).then(categoryElement => {
                            categoryElement.findElements(By.tagName('option')).then(optionArray => {
                                if (optionArray.length > 1) {
                                    GetCategoryCount(optionArray);
                                    async.eachSeries(categoryCount, function (value, thecallback) {
                                        driver.findElement(By.xpath('//*[@id="iJobCatId"]/option[' + value + ']')).then(option => {
                                            option.getAttribute('text').then(optionValue => {
                                                option.click().then(() => {
                                                    var removeOption = value - 1;
                                                    driver.findElement(By.xpath('//*[@id="iJobCatId"]/option[' + removeOption + ']')).then(optionAll => {
                                                        optionAll.click().then(() => {
                                                            driver.findElement(By.xpath('//*[@id="categories"]/div[2]/input[4]')).then(searchelement => {
                                                                searchelement.click().then(() => {
                                                                    driver.findElements(By.xpath('//*[@id="jobListSummary"]/table/tbody')).then(e => {
                                                                        return !!e.length;
                                                                    }).then(data => {
                                                                        if (data == true) {
                                                                            new Promise((onsuccess, onfailure) => {
                                                                                try {
                                                                                    forEachTag(driver, By, until, jobs, async, thecallback, optionValue);
                                                                                } catch (e) {
                                                                                    onfailure(e);
                                                                                }
                                                                            }).then(() => {
                                                                                thecallback();
                                                                            });
                                                                        }
                                                                        else {
                                                                            driver.navigate().back().then(() => {
                                                                                thecallback();
                                                                            });
                                                                        }
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
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

var forEachTag = (driver, By, until, jobs, async, thecallback, category) => {
    driver.findElements(By.xpath('//*[@id="jobListSummary"]/table/tbody/tr[2]')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver
                .findElement(By.xpath('//*[@id="jobListSummary"]/table/tbody/tr[2]/td[3]/a'))
                .then(titleElement => {
                    if (titleElement != null) {
                        titleElement.getText().then(title => {
                            driver.findElement(By.xpath('//*[@id="jobListSummary"]/table/tbody/tr[2]/td[3]')).then(jobIDElement => {
                                jobIDElement.getText().then(id => {
                                    driver.findElement(By.xpath('//*[@id="jobListSummary"]/table/tbody/tr[2]/td[2]')).then(dateElement => {
                                        dateElement.getText().then(date => {
                                            driver.findElement(By.xpath('//*[@id="jobListSummary"]/table/tbody/tr[2]/td[3]/a')).then(urlElement => {
                                                urlElement.getAttribute("href").then(url => {
                                                    titleElement.click().then(() => {
                                                        driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[8]/td[2]")).then(descriptionElement => {
                                                            descriptionElement.getAttribute("innerHTML").then(description => {
                                                                driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[3]/td[2]")).then(locationElement => {
                                                                    locationElement.getText().then(location => {
                                                                        driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[2]/td[2]")).then(element => {
                                                                            element.getText().then(contactcompany => {
                                                                                driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[6]/td[2]")).then(element => {
                                                                                    element.getText().then(salary => {
                                                                                        driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[4]/td[2]")).then(element => {
                                                                                            element.getText().then(industry => {
                                                                                                driver.findElement(By.xpath("//*[@id='jobDetails']/table/tbody/tr[5]/td[2]")).then(element => {
                                                                                                    element.getText().then(status => {
                                                                                                        driver.navigate().back().then(() => {
                                                                                                            job.JOB_TITLE = title;
                                                                                                            if (id) {
                                                                                                                var jobID = id.split("Req # ");
                                                                                                                jobID = jobID[1].split(industry);
                                                                                                                job.JDTID_UNIQUE_NUMBER = jobID[0];
                                                                                                            }
                                                                                                            job.TEXT = description;
                                                                                                            job.ASSIGNMENT_START_DATE = date;
                                                                                                            job.JOB_CATEGORY = category;
                                                                                                            job.JOB_CONTACT_COMPANY = contactcompany;
                                                                                                            job.JOB_SALARY = salary;
                                                                                                            job.JOB_STATUS = status;
                                                                                                            job.JOB_APPLY_URL = url;
                                                                                                            if (location) {
                                                                                                                var loc = location.split(",");
                                                                                                                job.JOB_LOCATION_CITY = loc[0];
                                                                                                                job.JOB_LOCATION_STATE = loc[1];
                                                                                                            }
                                                                                                            jobMaker.successful.add(job, botScheduleID);
                                                                                                            callback(false);
                                                                                                        }).catch(e => { });
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
                                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                                        }).catch(e => { });
                                    }).catch(e => { failedJobCount = failedJobCount + 1 });
                                }).catch(e => { });
                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                        }).catch(e => { });
                    }
                });
        }, function (err) {
            if (err) {
                throw err;
            }
        });
    }).then(() => {
        driver.navigate().back().then(() => {
            thecallback();
        });
    });
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {

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
}

