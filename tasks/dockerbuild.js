/*
 * grunt-dockerbuild
 * https://github.com/olesku/grunt-dockerbuild
 *
 * Copyright (c) 2015 Ole Fredrik Skudsvik
 * Licensed under the MIT license.
 */

'use strict';
var spawn = require('child_process').spawn;

var minTwoDigits = function (n) { 
  return (n < 10 ? '0' : '') + n;
};

var getTimestamp = function() {
  var d = new Date();

  return [d.getFullYear(), minTwoDigits(d.getMonth()+1),
  minTwoDigits(d.getDate()), minTwoDigits(d.getHours()), minTwoDigits(d.getMinutes()), minTwoDigits(d.getSeconds())].join('');
};

module.exports = function(grunt) {

  grunt.registerMultiTask('dockerbuild', 'Build and push docker containers.', function() {
    var options = this.options({
      registry: '',
      imageName: '',
      tag: getTimestamp(),
      dockerFile: '.',
      saveTagFile: ''
    });

    var expandedTag = options.registry + '/' + options.imageName + ':' + options.tag;
    var done = this.async();
    var queue = [];
    var pushQueue = function (func) {
      queue.push(func);
    };

    var runNext = function() {  
      if (queue.length < 1) return done();
      queue.shift()();
    };

    var spawnCommand = function (command, args, callback) {
      var run = spawn(command, args);
      
      run.stdout.on('data', function(data) {
        grunt.log.ok('' + data);
      });

      run.stderr.on('data', function(data) {
        grunt.log.error('' + data);
      });

      run.on('exit', function (exitCode) {
        callback(exitCode);
      });
    };

    pushQueue(function() {
        spawnCommand('docker', ['build', '-t', expandedTag, options.dockerFile], function (exitCode) {
          if (exitCode != 0) {
             grunt.fail.fatal('Docker build failed with exitcode: ' + exitCode)
          }

          runNext();
        })
      }
    );

    pushQueue(function() {
        spawnCommand('docker', ['push', expandedTag], function (exitCode) {
          if (exitCode != 0) {
             grunt.fail.fatal('Docker push failed with exitcode: ' + exitCode)
          }

          grunt.log.subhead('Image successfully pushed to ' + expandedTag);
          
          if (options.saveTagFile != '') {
            grunt.file.write(options.saveTagFile, expandedTag)
          }

          runNext();
        })
      }
    );    

    runNext();
  });
};
