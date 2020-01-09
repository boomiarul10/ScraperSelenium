'use strict';

/* Directives */

angular.module('ka.app.directives', []).
    directive('appVersion', function (version) {
        return function (scope, elm, attrs) {
            elm.text(version);
        };
    }).directive('clientmenu', function () {
        return {
            templateUrl: '/components/menu/view/clientMenu.html',
            restrict: 'E'
        }

    }).directive('menu', function () {
        return {
            templateUrl: '/components/menu/view/menu.html',
            restrict: 'E'
        }
    }).directive('globalsettingmenu', function () {
        return {
            templateUrl: '/components/menu/view/globalSettingMenu.html',
            restrict: 'E'
        }
    }).directive('dashboardmenu', function () {
        return {
            templateUrl: '/components/menu/view/dashboardMenu.html',
            restrict: 'E'
        }
    });



