angular.module('ka.app.dashboardHistoryController', []).controller('dashboardHistoryController',
    ['applicationService', '$scope', '$route', '$http', '$routeParams',
    function (applicationService, $scope, $route, $http, $routeParams) {
        
        $scope.clientDetails = {};
        $scope.executionCriteria = {};
        $scope.batchServerDetails = {};
        $scope.executionLogs = {};
        $scope.bots = [];
        $scope.bots.clientBotConfig = {};
        $scope.servers = {};
        $scope.botExecutionStatus = {};
        $scope.currentPage = 1;
        $scope.itemsPerPage = 10;
        $scope.sortSelect = { clientname: 'Client Name', botname: 'Bot Name', starttime: 'Start Date', endtime: 'End Date', servername: 'Server Name', statusid:'Execution Status'};
        $scope.sortOrder = { ASC: 'Ascending', DESC: 'Descending' }

        $scope.GetBots = function (executionCriteria) {
            $scope.BotName = false;
            $scope.ClientBotName = true;
            if (executionCriteria.client != null) {
                $http.get(applicationService.serviceUrl + 'botlist/' + executionCriteria.client.id).then(function successCallback(response) {
                    $scope.bots = response.data;
                        
                }, function errorCallback(response) {
                    console.log(response);
                });
            } else {
                InitBots();
            }
        }
        
        InitBots();
        
        function InitBots() {
            
            $scope.BotName = true;
            $scope.ClientBotName = false;
            
            $http.get(applicationService.serviceUrl + 'clientbots/').then(function successCallback(response) {
                $scope.bots = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
            $http.get(applicationService.serviceUrl + 'batchservers').then(function successCallback(response) {
                $scope.batchServerDetails = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
            $http.get(applicationService.serviceUrl + 'server/').then(function successCallback(response) {
                $scope.servers = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
            
            $http.get(applicationService.serviceUrl + 'getallbotexecutionstatus').then(function successCallback(response) {
                $scope.botExecutionStatus = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
                
        }
        $scope.GetExecutionLogs = function (executionCriteria) {
            if (executionCriteria.client === undefined || executionCriteria.client === null) {
                var client = null;
            } else {
                client = executionCriteria.client.id;
            }
            if (executionCriteria.bot === undefined || executionCriteria.bot === null) {
                var bot = null;
            } else {
                if (executionCriteria.bot.botconfigid == undefined)
                    bot = executionCriteria.bot.id;
                else
                    bot = executionCriteria.bot.botconfigid;
            }
            if (executionCriteria.createdAT === undefined || executionCriteria.createdAT === null) {
                var createdat = null;
            } else {
                createdat = executionCriteria.createdAT.toUTCString();
            }
            if (executionCriteria.updatedAT === undefined || executionCriteria.updatedAT === null) {
                var updatedat = null;
            } else {
                updatedat = executionCriteria.updatedAT.toUTCString();
            }
            if (executionCriteria.serverName === undefined || executionCriteria.serverName === null) {
                var servername = null;
            } else {
                servername = executionCriteria.serverName.name;
            }
            if (executionCriteria.executionStatus === undefined || executionCriteria.executionStatus === null) {
                var executionstatus = null;
            } else {
                executionstatus = executionCriteria.executionStatus.id;
            }
            if (executionCriteria.selectSort === undefined || executionCriteria.selectSort === null) {
                var sortselect = null;
            } else {
                sortselect = executionCriteria.selectSort;
            }
            if (executionCriteria.selectOrder === undefined || executionCriteria.selectOrder === null) {
                var sortorder = null;
            } else {
                sortorder = executionCriteria.selectOrder;
            }
                        
            
            $http.get(applicationService.serviceUrl + 'botexecutionlogs/' + client + '/' + bot + '/' + createdat + '/' + updatedat + '/' + servername + '/' + executionstatus + '/' + sortselect +'/'+sortorder).then(function successCallback(response) {
                $scope.executionLogs = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
        };
            
    }]);