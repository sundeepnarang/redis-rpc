# redis-rpc
A module to write microservices with Node.js
Absracts remote procedure call from one node server to other using redis pub/sub.

#Before You Begin

##What it Does?

Lets assume you have a application made of two node servers.  

* A dispatcher server which handles users and routes.
* A service module that performs backend tasks

1. This module will make a call from dispatcher module to service module.
2. Service module will then perform the task.
3. Once task is completed service module will tell the dispatcher module which will then call a callback for that task.

#Usage

##Install

    npm install redis-rpc

##Initialiize  

    var redis       = require("redis");  
    var redisRPCLib = require("redis-rpc");  
    var redisRPC    = new redisRPCLib(/\*options/\*);   

##Options  
    
    pub         : a redis client to publish data to.(Default : creates a redis client)
    sub         : a redis client to get data from.(Default : creates a redis client)
    pubModule*  : redis channel to publish data to. 
    subModule*  : redis channel to get data from.
    dispatcher  : boolean to tell if this a dispatcher or service module(Default : true)
    tasks       : an object containing functions for service module or calls for callbacks for dispatcher module
    pubError    : Function called if any error occurs while publishing
    subError    : Function called if any error occurs while subscribing
    argSep      : a string to separate argument name and value groups
    keyValSep   : a string to separate argument's name and value
    
     