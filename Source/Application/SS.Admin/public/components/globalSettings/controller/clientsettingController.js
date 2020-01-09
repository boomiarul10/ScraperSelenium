angular.module('ka.app.clientsettingController', ['ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns']).controller('clientsettingController',
    ['applicationService', '$scope', '$http', '$modal',
        function (applicationService, $scope, $http, $modal) {

            $scope.clientdetailsData = {};
            
            $scope.addClient = function (clientdetail) {
                if (!ClientExist(clientdetail.name)) {
                    $('#progressdiv').show();
                    //init TODO
                    if (clientdetail.isconcurrent === undefined) {
                        clientdetail.isconcurrent = false;
                    }
                    if (clientdetail.active === undefined) {
                        clientdetail.active = false;
                    }
                    $http({
                        url: applicationService.serviceUrl + 'clients/',
                        method: 'POST',
                        data: JSON.stringify(clientdetail)
                    }).then(function successCallback(response) {
                        Init();
                        $('#progressdiv').hide();
                        swal({
                            title: "Client Details added successfully",
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
                        title: "Client Name already exist. \n Please try with different name.",
                        confirmButtonColor: "#2a9fd6",
                    })
                }
            }


            $scope.editClientModal = function (clientdata) {

                $modal.open({
                    backdrop: true,
                    backdropClick: true,
                    dialogFade: false,
                    keyboard: true,
                    templateUrl: 'globalSettings/view/editClientModal',
                    controller: ['$modalInstance', 'clientdata', ClientModalInstanceCtrl],
                    controllerAs: 'vm',
                    resolve: {
                        clientdata: function () { return clientdata; }
                    }
                });
            };

            function ClientModalInstanceCtrl($modalInstance, clientdata) {
                var vm = this;
                vm.entity = angular.copy(clientdata);

                vm.save = save;
                vm.reset = reset;
                vm.close = close;

                function save() {
                    clientdata = angular.extend(clientdata, vm.entity);

                    if (clientdata.isconcurrent === undefined) {
                        clientdata.isconcurrent = false;
                    }
                    if (clientdata.active === undefined) {
                        clientdata.active = false;
                    }

                    $http({
                        url: applicationService.serviceUrl + 'clients/' + clientdata.id,
                        method: 'PATCH',
                        data: JSON.stringify(clientdata)
                    }).then(function successCallback(response) {
						swal({
                        title: "Client Details updated successfully",
                        confirmButtonColor: "#2a9fd6",
                    })
                        $modalInstance.close(clientdata);
                    }, function errorCallback(response) {
						swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                    });

                }

                function reset() {

                    $http.get(applicationService.serviceUrl + 'clients/' + clientdata.id).then(function successCallback(response) {
                        vm.entity = response.data;
                        clientdata = vm.entity;

                    }, function errorCallback(response) {
                        console.log(response);
                    });
                }

                function close() {
                    reset();
                    $modalInstance.close();
                }

            }
            Init();

            function ClientExist(name) {
                for (var i = 0; i < $scope.clientdetailsData.length; i++) {
                    if ($scope.clientdetailsData[i].name.toLowerCase() === name.toLowerCase())
                        return true;
                };
                return false
            };

            function Init() {
                $http.get(applicationService.serviceUrl + 'clients/').then(function successCallback(response) {
                    $scope.clientdetailsData = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

        }]);