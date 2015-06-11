/**
 * Created by Sundeep on 6/11/2015.
 */

var redisRPCLib = require("../index");

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