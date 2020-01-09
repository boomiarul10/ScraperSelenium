angular.module('ka.app.snippetMangementController', ['ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns']).controller('snippetMangementController',
    ['applicationService', '$scope', '$http', '$modal',
        function (applicationService, $scope, $http, $modal) {

            $scope.mSnippet = {};
            $scope.mSnippet.filepath = applicationService.frameworkFilePath;
            $scope.initialData = null;

            $scope.editSnippetModal = function (snippet) {

                $modal.open({
                    backdrop: true,
                    backdropClick: true,
                    dialogFade: false,
                    keyboard: true,
                    templateUrl: 'globalSettings/view/editSnippetModal',
                    controller: ['$modalInstance', 'snippet', SnippetModalInstanceCtrl],
                    controllerAs: 'vm',
                    windowClass: 'app-edit-modal-window',
                    resolve: {
                        snippet: function () { return snippet; }
                    }
                });
            };

            function SnippetModalInstanceCtrl($modalInstance, snippet) {
                var vm = this;
                vm.entity = angular.copy(snippet);

                vm.save = save;
                vm.reset = reset;
                vm.close = close;

                function save() {
                    snippet = angular.extend(snippet, vm.entity);
                    if (snippet.active === undefined) {
                        snippet.active = false;
                    }
                    $http({
                        url: applicationService.serviceUrl + 'snippet/' + snippet.id,
                        method: 'PATCH',
                        data: JSON.stringify(snippet)
                    }).then(function successCallback(response) {
                        Init();
						swal({
                        title: "Snippet Details updated successfully",
                        confirmButtonColor: "#2a9fd6",
                    })
                        $modalInstance.close(snippet);
                    }, function errorCallback(response) {
                        swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                    });


                }

                function reset() {

                    $http.get(applicationService.serviceUrl + 'snippet/' + snippet.id).then(function successCallback(response) {
                        vm.entity = response.data;
                        snippet = vm.entity;

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

            function Init() {

                $http.get(applicationService.serviceUrl + 'snippet').then(function successCallback(response) {
                    $scope.initialData = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            $scope.addSnippet = function (newSnippet) {
                if (!SnippetExist(newSnippet.name)) {
                    $('#progressdiv').show();
                    //init TODO
                    newSnippet.userdetailid = 3;
                    if (newSnippet.active === undefined) {
                        newSnippet.active = false;
                    }

                    $http({
                        url: applicationService.serviceUrl + 'snippet/',
                        method: 'POST',
                        data: JSON.stringify(newSnippet)
                    }).then(function successCallback(response) {
                        Init();
                        $('#progressdiv').hide();
                        swal({
                        title: "Snippet Details added successfully",
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
                        title: "Snippet Name already exist. \n Please try with different name.",
                        confirmButtonColor: "#2a9fd6",
                    })

            };

            function SnippetExist(name) {
                for (var i = 0; i < $scope.initialData.length; i++) {
                    if ($scope.initialData[i].name.toLowerCase() === name.toLowerCase())
                        return true;
                };
                return false
            };

            $scope.BuildSnippetScript = function (script) {
				swal({
                        title: "Sucess",
                        confirmButtonColor: "#2a9fd6",
						text: "Snippet script build status",
						type: "success"
                    })
            };
            
        }]);