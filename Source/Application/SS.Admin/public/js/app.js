'use strict';

// Declare app level module which depends on filters, and services

angular.module('ka.app', [
    'ka.app.controllers',
    'ka.app.filters',
    'ka.app.services',
    'ka.app.directives',
    'ka.app.clientcontroller', 'ka.app.scheduleController', 'ka.app.historyController', 'ka.app.snippetController', 'ka.app.clientsettingController', 'ka.app.botMangementController', 'ka.app.snippetMangementController', 'ka.app.variableMangemntController', 'ka.app.detailedHistoryController', 'ka.app.executionLogsHistoryController', 'ka.app.variableController', 'ka.app.metricsController', 'ka.app.executionDetailsController', 'ka.app.dashboardHistoryController'
]).
    config(function ($routeProvider, $locationProvider) {
        $routeProvider.
            when('/client', {
                templateUrl: 'client/view/clientDetails',
                controller: 'clientController'
            }).
            when('/client/:clientID', {
                templateUrl: 'client/view/clientDetails',
                controller: 'clientController'
            }).
            when('/bot/:clientID', {
                templateUrl: 'bot/view/botSettings',
                controller: 'botMangementController'
            }).
            when('/schedule/:clientID', {
                templateUrl: 'schedule/view/scheduleDetails',
                controller: 'scheduleController'
            }).
            when('/history/:clientID', {
                templateUrl: 'history/view/historyDetails',
                controller: 'historyController'
            }).
            when('/editbot/:clientID/:botid', {
                templateUrl: 'bot/view/editBot',
                controller: 'botController'
            }).
            when('/scheduleExecutionHistory/:clientID/:scheduleExecutionId', {
                templateUrl: 'history/view/scheduleHistory',
                controller: 'historyController'
            }).
            when('/bothistorylogs/:botexecId', {
                templateUrl: 'history/view/botHistoryLogs',
                controller: 'historyController'
            }).
            when('/setting', {
                templateUrl: 'globalSettings/view/clientSettings',
                controller: 'clientsettingController'
            }).
            when('/setting/snippet', {
                templateUrl: 'globalSettings/view/snippetSettings',
                controller: 'snippetMangementController'
            }).
            when('/setting/bot', {
                templateUrl: 'globalSettings/view/botSettings',
                controller: 'botMangementController'
            }).
            when('/setting/variable', {
                templateUrl: 'globalSettings/view/variableSettings',
                controller: 'variableMangemntController'
            }).
            when('/setting/detailedhistory', {
                templateUrl: 'globalSettings/view/detailedHistory',
                controller: 'detailedHistoryController'
            }).
            when('/setting/detailedhistorylogs/:botexecId', {
                templateUrl: 'globalSettings/view/detailedHistorylogs',
                controller: 'detailedHistoryController'
            }).
            when('/dashboard', {
                templateUrl: 'dashboard/view/metricsDetails',
                controller: 'metricsController'
            }).
            when('/dashboardhistory', {
                templateUrl: 'dashboard/view/history',
                controller: 'dashboardHistoryController'
            }).
            when('/executiondetails', {
                templateUrl: 'dashboard/view/executionDetails',
                controller: 'executionDetailsController'
            }).
            otherwise({
                redirectTo: '/client'
            });

        $locationProvider.html5Mode(true);
    });