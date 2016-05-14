var app = angular.module('app', ['ui.router', 'ngAnimate', 'ngMap', 'chart.js']);
app.config(function($urlRouterProvider, $locationProvider){
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/');
});
