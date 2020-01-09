angular.module('ka.app.variableMangemntController', ['ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns']).controller('variableMangemntController',
    ['applicationService', '$scope', '$http', '$modal',
        function (applicationService, $scope, $http, $modal) {

            $scope.initialData = null;
            $scope.mVariable = {};
            $scope.mVariable.filepath = applicationService.frameworkFilePath;

            $scope.editVariableModal = function (variabledata) {

                $modal.open({
                    backdrop: true,
                    backdropClick: true,
                    dialogFade: false,
                    keyboard: true,
                    templateUrl: 'globalSettings/view/editVariableModal',
                    controller: ['$modalInstance', 'variabledata', VariableModalInstanceCtrl],
                    controllerAs: 'vm',
                    windowClass: 'app-edit-modal-window',
                    resolve: {
                        variabledata: function () { return variabledata; }
                    }
                });
            };

            function VariableModalInstanceCtrl($modalInstance, variabledata) {
                var vm = this;
                vm.entity = angular.copy(variabledata);

                vm.save = save;
                vm.reset = reset;
                vm.deleteVariable = deleteVariable;
                vm.close = close;

                function save() {
                    variabledata = angular.extend(variabledata, vm.entity);
                    if (variabledata.active === undefined) {
                        variabledata.active = false;
                    }
                    $http({
                        url: applicationService.serviceUrl + 'variabletype/' + variabledata.id,
                        method: 'PATCH',
                        data: JSON.stringify(variabledata)
                    }).then(function successCallback(response) {
                        Init();
						swal({
                        title: "Variable Type Details updated successfully",
                        confirmButtonColor: "#2a9fd6",
                            })
                        reset();
                        $modalInstance.close(variabledata);
                    }, function errorCallback(response) {
                        swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                    });


                }

                function reset() {

                    $http.get(applicationService.serviceUrl + 'variabletype/' + variabledata.id).then(function successCallback(response) {
                        vm.entity = response.data;
                        variabledata = vm.entity;

                    }, function errorCallback(response) {
                        console.log(response);
                    });
                }

                function close() {
                    reset();
                    $modalInstance.close();
                }

                function deleteVariable() {

                    variabledata = angular.extend(variabledata, vm.entity);

                    variabledata.isdeleted = true;

                    swal({
                        title: "Are you sure?",
                        text: "To delete this VariableType",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonClass: "btn-danger",
                        confirmButtonText: "Yes, delete it!",
                        closeOnConfirm: false
                    },
                        function () {

                            $http({
                                url: applicationService.serviceUrl + 'variabletype/' + variabledata.id,
                                method: 'DELETE',
                                data: JSON.stringify(variabledata)
                            }).then(function successCallback(response) {
                                Init();
								swal({
                        title: "Variable Deleted.",
                        confirmButtonColor: "#2a9fd6",
                            })
                                $modalInstance.close(variabledata);
                            }, function errorCallback(response) {
                                swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                            });
							swal({
                        title: "Deleted!",
                        confirmButtonColor: "#2a9fd6",
						text: "VariableType has been deleted.",
						type: "success"
                    })
                        });
                }

            }

            function Init() {

                $http.get(applicationService.serviceUrl + 'variabletype').then(function successCallback(response) {
                    $scope.initialData = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            Init();

            function VariableExist(name) {
                for (var i = 0; i < $scope.initialData.length; i++) {
                    if ($scope.initialData[i].name.toLowerCase() === name.toLowerCase())
                        return true;
                };
                return false
            };


            $scope.addVariable = function (newVariable) {
                if (!VariableExist(newVariable.name)) {
                    $('#progressdiv').show();
                    //init TODO
                    newVariable.userdetailid = 3;
                    if (newVariable.active === undefined) {
                        newVariable.active = false;
                    }
                    newVariable.isdeleted = false;

                    $http({
                        url: applicationService.serviceUrl + 'variabletype/',
                        method: 'POST',
                        data: JSON.stringify(newVariable)
                    }).then(function successCallback(response) {
                        Init();
                        $('#progressdiv').hide();
						swal({
                        title: "Variable Details added successfully",
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
                else
					swal({
                        title: "Variable Name already exist. Please try with different name.",
                        confirmButtonColor: "#2a9fd6",
                    })
            };


            $scope.BuildVariableScript = function (script) {
				swal({
                        title: "Sucess!!",
                        confirmButtonColor: "#2a9fd6",
						text: "Variable script build status",
						type: "success"
                    })
            };

            $scope.save = function (bot) {
				swal({
                        title: "Variable Script Saved Successfully",
                        confirmButtonColor: "#2a9fd6",
                    })
            };

        }]);