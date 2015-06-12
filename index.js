/**
 * Created by Sundeep on 6/10/2015.
 */

var redis = require('redis');

function RedisRPC(options){
    this.pub            = options.pub||redis.createClient();
    this.sub            = options.sub||redis.createClient();
    this.subModule      = options.subModule || "subscriber";
    this.pubModule      = options.pubModule || "publisher";
    this.tasks          = options.tasks||{};
    this.argSep         = options.argSep||"|||";
    this.keyValSep      = options.keyValSep||":::";

    if(typeof(options.dispatcher)!="boolean") {
        options.dispatcher = true;
    }

    this.dispatcher     = options.dispatcher;

    if(typeof (options.subError)!=="function"){
        this.subError = function(){
            var argsArray = Array.prototype.slice.call(arguments);
            argsArray.forEach(function(d,i){
                console.log("Argument(" + i + ") : ",d);
            });
        }
    }else {
        this.subError         = options.subError;
    }

    if(typeof (options.pubError)!=="function"){
        this.pubError = function(){
            var argsArray = Array.prototype.slice.call(arguments);
            argsArray.forEach(function(d,i){
                console.log("Argument(" + i + ") : ",d);
            });
        }
    }else {
        this.pubError         = options.pubError;
    }

    var that = this;

    this.sub.subscribe(this.subModule);

    this.sub.on("message", function(channel, message){
        if(channel==that.subModule){
            var args = [];
            var socketId;
            var task;
            var callback;
            var echo = false;

            var argsHash = message.split(that.argSep);
            if((!argsHash)||(!argsHash.length)){
                return that.subError(new Error("Error getting arguments"),message,{argsHash : argsHash});
            }

            for(var i = 0;i<argsHash.length;i++){
                var keyVal = argsHash[i].split(that.keyValSep);
                if((keyVal.length==2)&&(typeof(keyVal[0]) == "string")&&(typeof(keyVal[1]) == "string")) {
                    var key = keyVal[0].trim();
                    var val = keyVal[1].trim();
                    if(key == "echo"){
                        echo = true;
                    } else if(key == "socketId") {
                        socketId = val;
                    } else if(key == "task") {
                        task = val;
                    } else if(key.substr(0,4) == "args") {
                        var keyParts = key.split("&");
                        if(keyParts.length == 3){
                            var argNum = parseInt(keyParts[2]);
                            switch (keyParts[1]){
                                case 'number' :
                                    val = parseInt(val);
                                    break;
                                case 'date' :
                                    try {
                                        val = new Date(JSON.parse(val));
                                    } catch(e){
                                        that.subError(e,message,{key : key,val : val,keyParts:keyParts });
                                    }
                                    break;
                                case 'null' :
                                    val = null;
                                    break;
                                case 'array'  :
                                case 'object' :
                                    try {
                                        val = JSON.parse(val);
                                    } catch(e){
                                        that.subError(e,message,{key : key,val : val,keyParts:keyParts });
                                    }
                                    break;
                                case 'undefined' :
                                    val = null;
                                    that.subError(new Error("Error undefined argument"),message,{key : key,val : val });
                                    break;
                                case 'string' :
                                    break;
                                default :
                                    return that.subError(new Error("Error unknown argument type"),message,{key : key,val : val,keyParts:keyParts });
                            }

                            args[argNum] = val;
                        } else {
                            //that.subError("Error in Extra arguments",message,{},{key : key,val : val,keyParts:keyParts });
                        }
                    } else {
                        //that.subError("Error in arguments",message,{},{key : key,val : val,keyParts:keyParts });
                    }
                }
                else {
                    return that.subError(new Error("Error getting arguments"),message,{keyVal : keyVal});
                }
            }

            var done = function(){
                var message = (echo?'echo' + that.keyValSep + 'echo':'task'+ that.keyValSep + task)
                    + (socketId?that.argSep + 'socketId'+ that.keyValSep + socketId:'');
                var argsArray = Array.prototype.slice.call(arguments);
                argsArray.forEach(function(d,i){
                    var ArgType = typeof (d);
                    if(ArgType=="object") {
                        if(d instanceof  Date){
                            ArgType = "date";
                            d = JSON.stringify(d);
                        } else if ( d === null){
                            ArgType = "null";
                            d = '';
                        } else{
                            d = JSON.stringify(d);
                        }
                    } else if(ArgType=="undefined"){
                        d = '';
                    }

                    message = message + that.argSep + 'args&'+ ArgType + '&' + i + that.keyValSep + d;
                }) ;

                that.pub.publish(that.pubModule,message);
            };

            if(that.dispatcher){
                if(echo){
                    return console.log(args);
                }
                if(socketId) args.push(socketId);
            }else {
                if(echo){
                    return done.apply(null,args);
                }
                args.push(done);
            }



            if(typeof (that.tasks[task])!=="function"){
                return that.subError(new Error("No task found to run"));
            }else {
                callback = that.tasks[task];
            }
            callback.apply(null,args);


        } else {
            console.log("\nRedis-RPC: Mesage on Undefined Channel\n"
                + '\nChannel : [' + channel + "]."
                + '\nMessage : [' + message + "].");
        }

    });

    this.argTypes = ["object","array","date","string","number","null"];

    this.getArgType = function (a){
        var type = typeof (a);
        if(type!=="object") return type;
        if(a instanceof  Date){
            return "date";
        } else if ( a === null){
            return "null";
        } else{
            return type;
        }
    };

    this.argToStr = function(a,b) {
        switch (a) {
            case "object" :
            case "date" :
                b = JSON.stringify(b);
                break;
            case "null" :
                b = '';
                break;
            case "undefined" :
                b = '';
                break;
            case  "number" :
                b = b + '';
                break;
        }
        return b;
    };
}

RedisRPC.prototype.sendCall = function(options){

    var echo = false;
    if(options.echo){
        echo = true;
    }

    if(!(echo)&&((!options.task)||(typeof(options.task)!="string"))){
        console.log("echo : ",echo);
        return this.pubError(new Error("Task no defined or not string type!"));
    }

    if((!options.args)||(typeof(options.args)!="object") ||!(options.args instanceof Array)){
        return this.pubError(new Error("Arguments no defined or not Array type!"));
    }
    if(options.argTypes){
        if((options.argTypes instanceof Array)&&(options.argTypes.length===options.args.length)){
            for(var i = 0;i<options.argTypes.length;i++){
                if(typeof(options.argTypes[i])!=="string") {
                   return this.pubError(new Error("Arguments types can only be string!"));
                }
                if(this.argTypes.indexOf(options.argTypes[i])==-1){
                    return this.pubError(new Error("Arguments type " + options.argTypes[i] + " not valid!"));
                }
                options.args[i] = this.argToStr(options.argTypes[i],options.args[i]);
            }
        }else {
            return this.pubError(new Error("Argument Types provided not Array of equal length to Arguments"));
        }
    }else {
        options.argTypes = [];
        for(i = 0;i<options.args.length;i++){
            options.argTypes[i] = this.getArgType(options.args[i]);
            options.args[i] = this.argToStr(options.argTypes[i],options.args[i])
        }
    }
    if((options.sessionId)&&(typeof(options.sessionId) != "string")){
        return this.pubError(new Error("Only string SessionId can be provided"));
    }
    var task        = options.task;
    var args        = options.args;
    var argTypes    = options.argTypes;
    var socketId    = options.sessionId;
    var message = (echo?'echo' + this.keyValSep + 'echo':'task'+ this.keyValSep + task)
        + (socketId?this.argSep + 'socketId'+ this.keyValSep + socketId:'');
    var that = this;
    args.forEach(function(d,i) {
        message = message + that.argSep + 'args&' + argTypes[i] + '&' + i + that.keyValSep + d;
    });

    this.pub.publish(this.pubModule,message);
};

RedisRPC.prototype.echo = function () {
    var args = Array.prototype.slice.call(arguments);
    this.sendCall({
       args :args,
       echo : true
    });
};

module.exports = RedisRPC;
