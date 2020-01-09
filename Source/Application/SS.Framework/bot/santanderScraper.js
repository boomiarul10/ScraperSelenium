var Promise = require('promise');
var package = global.createPackage();

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            onfailure(e);
        }
    });
}

var core = (configuration, onsuccess, onfailure) => {

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

    driver.get('https://santanderus.taleo.net/careersection/2/moresearch.ftl');
    driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]')).then(locationElement => {
        locationElement.findElements(By.tagName('option')).then(optionArray => {
            if (optionArray.length > 1) {
                GetCategoryCount(optionArray);
                async.eachSeries(categoryCount, function (value, thecallback) {
                    driver.findElement(By.xpath('//Select[@id="advancedSearchInterface.jobfield1L1"]/Option[' + value + ']')).then(option => {
                        option.getAttribute('text').then(optionValue => {
                            var categoryValue = optionValue;
                            option.click().then(() => {
                                driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.searchAction"]')).then(searchelement => {
                                    searchelement.click().then(() => {
                                        driver.findElements(By.id('requisitionListInterface.ID8139.row')).then(e => {
                                            return !!e.length;
                                        }).then(data => {
                                            if (data == true) {
                                                new Promise((onsuccess, onfailure) => {
                                                    try {
                                                        forEachTag(driver, By, until, jobs, async, thecallback, categoryValue);
                                                    } catch (e) {
                                                        onfailure(e);
                                                    }
                                                }).then(() => {
                                                    thecallback();
                                                });
                                            }
                                            else {
                                                driver.findElement(By.id('advancedSearchFooterInterface.clearAction')).then(searchELement => {
                                                    searchELement.click().then(() => {
                                                        thecallback();
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });
    })
        .then(() => {
            driver.quit();
            snippet(configuration, jobMaker, onsuccess, onfailure);
        }, err => {
            driver.quit();
            onfailure(err);
        });
}

function GetCount(jobList) {
    jobCount = new Array();
    for (var i = 1; i <= jobList.length; i++) {
        jobCount.push(i);
    }
}

var forEachTag = (driver, By, until, jobs, async, thecallback, categoryValue) => {
    driver.findElements(By.id('requisitionListInterface.ID8139.row')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver
                .findElement(By.xpath('//tr[@id=\'requisitionListInterface.ID8139.row\'][' + prime + ']/td[2]/div/div/div/div/h3/span[@class=\'titlelink\']'))
                .then(titleElement => {
                    if (titleElement != null) {
                        titleElement.getText().then(title => {
                            driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqContestNumberValue.row1"]')).then(jobIDElement => {
                                jobIDElement.getText().then(id => {
                                    driver.findElement(By.xpath('//*[@id="requisitionListInterface.reqPostingDate.row1"]')).then(dateElement => {
                                        dateElement.getText().then(date => {
                                            driver.findElement(By.xpath('//tr[@id=\'requisitionListInterface.ID8139.row\'][' + prime + ']/td[2]/div/div/div/div/h3/span[@class=\'titlelink\']')).then(urlElement => {
                                                urlElement.click().then(() => {
                                                    driver.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID3260.row.row1']/td[1]/div")).then(descriptionElement => {
                                                        descriptionElement.getAttribute("innerHTML").then(description => {
                                                            driver.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1749.row1']")).then(locationElement => {
                                                                locationElement.getText().then(location => {
                                                                    driver.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1861.row1']")).then(element => {
                                                                        element.getText().then(status => {
                                                                            driver.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1693.row1']")).then(element => {
                                                                                element.getText().then(industry => {
                                                                                    driver.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.backAction"]')).then(element => {
                                                                                        element.click().then(() => {
                                                                                            job.title = title;
                                                                                            job.id = id;
                                                                                            job.description = description;
                                                                                            job.posteddate = date;
                                                                                            job.category = categoryValue;
                                                                                            job.status = status;
                                                                                            job.industry = industry;
                                                                                            job.applyurl = "https://santanderus.taleo.net/careersection/2/jobdetail.ftl?job=" + id;
                                                                                            if (location) {
                                                                                                var loc = location.split("-");
                                                                                                job.city = loc[0];
                                                                                                job.state = loc[1];
                                                                                            }
                                                                                            jobMaker.successful.add(job);
                                                                                            callback(false);
                                                                                        }).catch(e => { });
                                                                                    }).catch(e => { });
                                                                                }).catch(e => { });
                                                                            }).catch(e => { });
                                                                        }).catch(e => { });

                                                                    });
                                                                }).catch(e => { });
                                                            }).catch(e => { });
                                                        }).catch(e => { });
                                                    }).catch(e => { });
                                                }).catch(e => { });
                                            }).catch(e => { });
                                        }).catch(e => { });
                                    }).catch(e => { });
                                }).catch(e => { });
                            }).catch(e => { });
                        }).catch(e => { });
                    }
                });
        }, function (err) {
            if (err) { throw err; }
        });
    }).then(() => {
        driver.findElements(By.xpath('//span[@id=\'requisitionListInterface.pagerDivID4123.panel.Next\']/span[@class=\'pagerlink\']')).then(e => {
            if (e.length == 1) {
                driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4123.Next"]')).then(nextElement => {
                    nextElement.click().then(() => {
                        forEachTag(driver, By, until, jobs, async, thecallback);
                    });
                });
            }
            else {
                driver.findElement(By.id('advancedSearchFooterInterface.clearAction')).then(searchELement => {
                    searchELement.click().then(() => {
                        var x = 1;
                        thecallback();
                    });
                });
            }
        });
    });
}



var snippet = (configuration, jobs, onsuccess, onfailure) => {

    var snippet = package.resource.download.snippet("writeObjectToFile");

    var input = snippet.createSnippetInput(configuration, jobs);

    snippet
        .execute(input)
        .then(jobcount => {
            var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount);
            onsuccess(output);
        })
        .catch(err => {
            onfailure(err);
        });
}


