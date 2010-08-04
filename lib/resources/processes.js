// Manage processes

var EventEmitter = require('events').EventEmitter;
var Resource = require(__dirname + '/../resource');
var Process = require(__dirname + '/process');
 
module.exports = function Processes (params) {
    var user = params.user;
    var disks = params.disks;
    var manager = params.manager;
    var processes = params.processes;
    
    var self = null;
    if (user.name in Processes) {
        self = Processes[user.name];
    }
    else {
        self = new EventEmitter;
        self.resource = new Resource(self);
        self.connections = 0;
        processes.forEach(function (proc) {
            proc.on('kill', function () {
                self.emit('kill', proc.addr);
            });
        });
    }
    
    function Disk (file, conn) {
        return {
            name : disks[file].name,
            filename : file,
            processes : processes.filter(function (proc) {
                return proc.disk == file;
            }),
            spawn : function (engine) { manager.spawn(
                { user : user, disk : file, engine : engine },
                function (proc) {
                    var p = new Process({
                        connection : conn,
                        proc : proc,
                        mode : 'rwx'
                    });
                    proc.on('kill', function () {
                        self.emit('kill', proc.addr);
                    });
                    processes[proc.addr] = p;
                    self.emit('spawn', p);
                }
            ) },
        };
    }
    
    return {
        bind : function (em, conn) {
            self.connections ++;
            self.resource.subscribe(em, conn);
            em.emit('list', Object.keys(disks).reduce(function (acc,file) {
                acc.push({
                    name : disks[file].name,
                    filename : file,
                    processes : processes.filter(function (proc) {
                        return proc.disk == file;
                    });
                });
                return acc;
            }, []);
            
            conn.on('end', function () {
                self.connections --;
                if (self.connections <= 0) {
                    delete Processes[user.name];
                }
            });
        },
    };
};
