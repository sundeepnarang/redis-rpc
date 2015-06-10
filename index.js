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

    if(typeof (options.subErr)!=="function"){
        this.subErr = function(){
            var argsArray = Array.prototype.slice.call(arguments);
            argsArray.forEach(function(d,i){
                console.log("Argument(" + i + ") : ",d);
            });
        }
    }else {
        this.subErr         = options.subErr;
    }

    var that = this;

    this.sub.subscribe(this.subModule);

    this.sub.on("message", function(channel, message){
        if(channel==that.subModule){
            var args = [];
            var socketId;
            var task;
            var callback;

            var argsHash = message.split(that.argSep);
            if((!argsHash)||(!argsHash.length)){
                return that.subErr("Error getting arguments",message,{},{argsHash : argsHash});
            }

            for(var i = 0;i<argsHash.length;i++){
                var keyVal = argsHash[i].split(that.keyValSep);
                if((keyVal.length==2)&&(typeof(keyVal[0]) == "string")&&(typeof(keyVal[1]) == "string")) {
                    var key = keyVal[0].trim();
                    var val = keyVal[1].trim();
                    if(key == "socketId") {
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
                                        that.subErr("Error in arguments Parsing",message,e,{key : key,val : val,keyParts:keyParts });
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
                                        that.subErr("Error in arguments Parsing",message,e,{key : key,val : val,keyParts:keyParts });
                                    }
                                    break;
                                case 'undefined' :
                                    val = null;
                                    that.subErr("Error undefined argument",message,{},{key : key,val : val });
                                    break;
                                case 'string' :
                                    break;
                                default :
                                    return that.subErr("Error unknown argument type",message,{},{key : key,val : val,keyParts:keyParts });
                            }

                            args[argNum] = val;
                        } else {
                            //that.subErr("Error in Extra arguments",message,{},{key : key,val : val,keyParts:keyParts });
                        }
                    } else {
                        //that.subErr("Error in arguments",message,{},{key : key,val : val,keyParts:keyParts });
                    }
                    args[keyVal[0].trim()] = keyVal[1].trim();
                }
                else {
                    return that.subErr("Error getting arguments",message,{},{keyVal : keyVal});
                }
            }
            args.push(socketId);

            if(typeof (that.tasks[task])!=="function"){
                callback = that.subErr;
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

}

RedisRPC.prototype.sendCall = function(options){

};

module.exports = RedisRPC;