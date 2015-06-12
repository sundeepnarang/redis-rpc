# redis-rpc
A module to write microservices with Node.js
Abstracts remote procedure call from one node server to other using redis pub/sub.

#Before You Begin

##What it Does?

Lets assume you have a application made of two node servers.  

* A dispatcher server which handles users and routes.
* A service module that performs backend tasks.

1. This module will make a call from dispatcher module to service module.
2. Service module will then perform the task.
3. Once task is completed service module will send data to the dispatcher module which will then call a callback for that task.

##Pre-requisites

A redis server should be up and running on the machine.

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
    subError    : Function called if any error occurs on a message from subscribed channel
    argSep      : a string to separate argument name and value groups
    keyValSep   : a string to separate argument's name and value
    

#Example

##Assumptions

There are 2 node servers running  

1. Dispatcher Server
2. Service Server

Dispatcher server wants to call a function "Add" on Service Server.
 
##Code  
    
###Dispatcher Server 
    var redisRPCLib = require("redis-rpc");
    
    var redisRPC = new redisRPCLib({
        subModule : "dispatcher",    // Dispatcher will listen for data on dispatcher channel
        pubModule : "service",       // Service will listen for data on service channel    
        tasks     : {               // Callback functions for each task. 
                                    //*Task and callback name should be same*            
            //Callback to call once service finishes Adding            
            Add : function(err,result){
                if(err){
                    return console.log(err);
                }
                console.log("Addition result : ",result);
            }
        },
        dispatcher  : true          // Telling redis-rpc that this is a 
                                    // dispatcher and task results do not need to be published 
    });
    
    //Make Call
    
    redisRPC.sendCall({
        task : "Add",
        args : [1, 2]
    });
    
###Service Server   
    var redisRPCLib = require("redis-rpc");
     
    var redisRPC = new redisRPCLib({
            subModule : "service",      // Service will listen for data on service channel
            pubModule : "dispatcher",   // Dispatcher will listen for data on dispatcher channel    
            tasks     : {               // functions for each task. 
                                        //*Task and callback name should be same*                
                //Function to add                
                Add : function(a,b,done){           //Redis-RPC will always pass the last argument as callback
                    done(a+b);
                }
            },
            dispatcher  : false          // Telling redis-rpc that this is not a 
                                        // dispatcher and task results need to be published 
        });
        
##sendCall Function
         
It only takes one object argument with following properties.

    task*           : Name of the task
    args*           : An array of arguments
    argTypes        : An array of argument data types (only supported are ["object","array","date","string","number","null"]). 
    sessionId       : A sessionId which will be automatically added as the last argument to callback on dispatcher.          
          
#To Do  

* Add support for boolean types
* Add tasks after initialization