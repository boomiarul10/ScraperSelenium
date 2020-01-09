'use strict';

///* Controllers */
angular.module('ka.app.controllers', ['ui.bootstrap']).controller('AppCtrl',
    ['applicationService', '$scope', '$http', '$location', '$route', '$window',
        function (applicationService, $scope, $http, $location, $route, $window) {

            $scope.ClientPage = true;
            $scope.Dashboard = false;
            $scope.GlobalSetting = false;

            $scope.clientPage = function () {
                $scope.ClientPage = true;
                $scope.Dashboard = false;
                $scope.GlobalSetting = false;
                $window.location.reload();
            };

            $scope.dashboardPage = function () {
                $scope.ClientPage = false;
                $scope.Dashboard = true;
                $scope.GlobalSetting = false;
                $scope.activeMenu = 'Metrics';
            }

            $scope.settingsPage = function () {
                $scope.ClientPage = false;
                $scope.Dashboard = false;
                $scope.GlobalSetting = true;
                $scope.activeMenu = 'Client';
            }

            if ($scope.ClientPage) {
                $http.get(applicationService.serviceUrl + 'clients').then(function successCallback(response) {
                    $scope.clients = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });

                $scope.isClientSelected = false;
                $scope.DropDownChanged = function () {
                    $scope.isClientSelected = true;
                    $scope.schedules = new Array();
                    $scope.bots = new Array();
                    $scope.scheduleExecutions = new Array();
                    $location.path('/client/' + $scope.mClient.id);
                    $scope.activeMenu = 'Clients';
                };
            }         
            
        }]);