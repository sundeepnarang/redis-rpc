/**
 * Created by Sundeep on 6/11/2015.
 */

var redisRPCLib = require("../index");

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