'use strict';

angular.module('ka.app.services', []).
    value('version', '0.1').service('applicationService', function ($window) {
        return configuration($window.location.hostname);
    });

var configuration = (hostname) => {

    var environment = "development";

    switch (hostname) {
        case "127.0.0.1":
            environment = "development";
            break;
        case "localhost":
            environment = "development";
            break;
        case "172.17.4.21":
            environment = "staging";
            break;
        case "172.17.7.234":
            environment = "production";
            break;
        default:
            environment = "development";
            break;
    }

    var apiPath = '/api/';

    var config = {
        serviceUrl: 'http://localhost:3000' + apiPath,
        frameworkFilePath: '/opt/selenium/application/SS.Framework',
        feedPath: 'c:\\feeds'
    }

    switch (environment) {
        case "development":
            config = {
                serviceUrl: 'http://localhost:3000' + apiPath,
                frameworkFilePath: '/opt/selenium/application/SS.Framework',
                feedPath: 'c:\\feeds'
            }
            break;
        case "staging":
            config = {
                serviceUrl: 'http://172.17.4.21:3000' + apiPath,
                frameworkFilePath: '/opt/selenium/application/SS.Framework',
                feedPath: '/mnt/selenium/staging-feed/'
            }
            break;
        case "production":
            config = {
                serviceUrl: 'http://172.17.7.234:3000' + apiPath,
                frameworkFilePath: '/opt/selenium/application/SS.Framework',
                feedPath: '/mnt/selenium/aws/'
            }
            break;
        default:
            config = {
                serviceUrl: 'http://localhost:3000' + apiPath,
                frameworkFilePath: '/opt/selenium/application/SS.Framework',
                feedPath: 'c:\\feeds'
            }
            break;
    }
    return config;
}