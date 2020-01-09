angular.module('ka.app.botMangementController', ['ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns']).controller('botMangementController',
    ['applicationService', '$scope', '$http', '$modal', '$routeParams', '$location',
        function (applicationService, $scope, $http, $modal, $routeParams, $location) {

            $scope.selectedClientId = '';
            $scope.initialData = {};
            $scope.defaultCode = "var Promise = require('promise');\nvar package = global.createPackage();\n\n Default Snippet\n{\n }";
            $scope.mBot = {};
            $scope.mBot.script = $scope.defaultCode;
            $scope.mBot.filepath = applicationService.frameworkFilePath;
            $scope.mBot.outputpath = applicationService.feedPath;
            $http.get(applicationService.serviceUrl + 'clients/' + $routeParams.clientID).then(function successCallback(response) {
                $scope.mBot.outputpath = applicationService.feedPath + response.data.name;
            }, function errorCallback(response) {
                console.log(response);
            });
            $scope.browsers = ['Chrome', 'Firefox', 'PhantomJS', 'Internet Explorer'];               
            $scope.trigger = {};

            $scope.aceLoaded = function (_editor) {
                _editor.$blockScrolling = Infinity;
            };
            

            GetAllSnippets();

            function GetAllSnippets() {

                $http.get(applicationService.serviceUrl + 'snippet').then(function successCallback(response) {
                    $scope.snippets = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            GetAllBotTypes();

            function GetAllBotTypes() {

                $http.get(applicationService.serviceUrl + 'bottype').then(function successCallback(response) {
                    $scope.bottype = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            GetAllVariableTypes();

            function GetAllVariableTypes() {

                $http.get(applicationService.serviceUrl + 'variabletype').then(function successCallback(response) {
                    $scope.variabletypes = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            $scope.open = function (id) {
                var modalInstance = $modal.open({
                    templateUrl: 'bot/view/popup',
                    controller: 'snippetController',
                    resolve: {
                        editId: function () {
                            console.log('size: ', id);
                            return id;
                        }
                    }
                });
            };

            
            

            $scope.openVariable = function (id) {
                var modalInstance = $modal.open({
                    templateUrl: 'bot/view/variable-popup',
                    controller: 'variableController',
                    resolve: {
                        editId: function () {
                            console.log('size: ', id);
                            return id;
                        }
                    }
                });
            };

            $scope.editBotModal = function (bot) {

                $modal.open({
                    backdrop: true,
                    backdropClick: true,
                    dialogFade: false,
                    keyboard: true,
                    templateUrl: 'bot/view/editBotModal',
                    controller: ['$modalInstance', 'bot', BotModalInstanceCtrl],
                    controllerAs: 'vm',
                    windowClass: 'app-edit-modal-window',
                    resolve: {
                        bot: function () { return bot; }
                    }
                });
            };

            function BotModalInstanceCtrl($modalInstance, bot) {
                var vm = this;
                vm.entity = angular.copy(bot);

                vm.save = save;
                vm.deleteBot = deleteBot;
                vm.reset = reset;
                vm.close = close;

                function save() {
                    bot = angular.extend(bot, vm.entity);
                    if (bot.clientBotConfig.active === undefined) {
                        bot.clientBotConfig.active = false;
                    }
                    $http({
                        url: applicationService.serviceUrl + 'bot/' + bot.clientBotConfig.id,
                        method: 'PATCH',
                        data: JSON.stringify(bot.clientBotConfig)
                    }).then(function successCallback(response) {
                        swal({
                            title: "Bot Details updated successfully",
                            confirmButtonColor: "#2a9fd6",
                        })
                        $modalInstance.close(bot);
                    }, function errorCallback(response) {
                        swal({
                            title: "Error!!",
                            confirmButtonColor: "#2a9fd6",
                        })
                    });


                }

                function reset() {

                    $http.get(applicationService.serviceUrl + 'bot/' + bot.clientBotConfig.id).then(function successCallback(response) {
                        if (response.data.script == "") {
                            response.data.script = $scope.defaultCode;
                        }
                        vm.entity.clientBotConfig = response.data;
                        bot.clientBotConfig = vm.entity.clientBotConfig;

                    }, function errorCallback(response) {
                        console.log(response);
                    });
                }

                function close() {
                    reset();
                    $modalInstance.close();
                }

                function deleteBot() {

                    bot = angular.extend(bot, vm.entity);

                    bot.clientBotConfig.isdeleted = true;

                    swal({
                        title: "Are you sure?",
                        text: "To delete this Bot",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonClass: "btn-danger",
                        confirmButtonText: "Yes, delete it!",
                        closeOnConfirm: false
                    },
                        function () {

                            $http({
                                url: applicationService.serviceUrl + 'bot/' + bot.clientBotConfig.id,
                                method: 'PATCH',
                                data: JSON.stringify(bot.clientBotConfig)
                            }).then(function successCallback(response) {
                                Init();
                                swal({
                                    title: "Bot Details updated successfully",
                                    confirmButtonColor: "#2a9fd6",
                                })
                                $modalInstance.close(bot);
                            }, function errorCallback(response) {
                                swal({
                                    title: "Error!!",
                                    confirmButtonColor: "#2a9fd6",
                                })
                            });

                            swal({
                                title: "Deleted!",
                                confirmButtonColor: "#2a9fd6",
                                text: "Bot has been deleted.",
                                type: "success"
                            })
                        });
                }
            }

            Init();

            function Init() {
                $http.get(applicationService.serviceUrl + 'botlist/' + $routeParams.clientID).then(function successCallback(response) {
                    for (var i = 0; i < response.data.length; i++) {
                        if (response.data[i].clientBotConfig.script == "") {
                            response.data[i].clientBotConfig.script = $scope.defaultCode;
                        }
                    }
                    $scope.initialData = response.data;

                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            function BotExist(name) {
                for (var i = 0; i < $scope.initialData.length; i++) {
                    if ($scope.initialData[i].clientBotConfig.name.toLowerCase() === name.toLowerCase())
                        return true;
                };
                return false
            };
            

            $scope.addBot = function (newBot) {
                if (!BotExist(newBot.name)) {
                    $('#progressdiv').show();
                    //Todo init
                    newBot.userdetailid = 3;
                    if (newBot.active === undefined) {
                        newBot.active = false;
                    }
                    newBot.isdeleted = false;

                    $http({
                        url: applicationService.serviceUrl + 'bot/' + $routeParams.clientID,
                        method: 'POST',
                        data: JSON.stringify(newBot)
                    }).then(function successCallback(response) {
                        Init();
                        $('#progressdiv').hide();
                        swal({
                            title: "Bot Details added successfully",
                            confirmButtonColor: "#2a9fd6",
                        })

                    }, function errorCallback(response) {
                        $('#progressdiv').hide();
                        swal({
                            title: "Error!!",
                            confirmButtonColor: "#2a9fd6",
                        })
                    });
                }
                else {
                    swal({
                        title: "Bot Name already exist. \n Please try with different name.",
                        confirmButtonColor: "#2a9fd6",
                    })
                }
            };

            $scope.BuildBotScript = function (script) {
                swal({
                    title: "Sucess",
                    confirmButtonColor: "#2a9fd6",
                    text: "Bot script build status",
                    type: "success"
                })
            };

            $scope.ClientDropDownChange = function (client) {
                $scope.selectedClientId = client.id;

            }

            $scope.getBotID = function (id) {
                swal({
                    title: "Bot ID:" + id
                });
            }

            $scope.triggerScrape = function (id) {

                $scope.trigger.botconfigid = id;
                $scope.trigger.clientid = $routeParams.clientID;
                $scope.trigger.userdetailid = 3;

                $http({
                    url: applicationService.serviceUrl + 'botExecution',
                    method: 'POST',
                    data: JSON.stringify($scope.trigger)
                }).then(function successCallback(response) {
                    $('#progressdiv').hide();
                    swal({
                        title: "Bot Trigger created  successfully",
                        confirmButtonColor: "#2a9fd6",
                    })
                    var earl = '/bothistorylogs/' + response.data.id;
                    $location.path(earl);
                }, function errorCallback(response) {
                    $('#progressdiv').hide();
                    swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                });

            };


        }]);