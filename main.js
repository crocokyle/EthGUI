const electron = require('electron');
const url = require('url');
const path = require('path');
var child = require('child_process').exec;
var spawn = require('child_process').spawn;
var os = require('os');


const {app, BrowserWindow, Menu} = electron;

let mainWindow;
let settingsWindow;
var miner;
var running;

// Listen for app to be ready
app.on('ready', function() {
    
    // Create new window
    mainWindow = new BrowserWindow({

        width: 1000,
        height: 500,
        //frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    // Load HTML into the BrowserWindow
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'html/easy.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Quit on main frame closed
    mainWindow.on('closed', function(){
        app.quit();
    })

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu - comment out for dev menu
    Menu.setApplicationMenu(mainMenu);
});

// Menu Template
const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Settings',
                click(){openSettingsWindow();}
            },
            {
                label: 'Exit',
                click(){app.quit();}
            }
        ]
    },
];

// Optimize menu for macOS
if(process.platform == 'darwin'){
    // Add empty object to beginning of the main menu array
    mainMenuTemplate.unshift({});
}

// Add dev tools when not running prod
if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
        label: 'Dev Tools',
        submenu: [
            {
                label: 'Toggle Dev Tools',
                click(item, focusedWindow){focusedWindow.toggleDevTools();}
            },
            {
                role: 'reload'
            }
        ]
    })
}

// Function to open a new window
function openSettingsWindow() {
    // Create new window
    settingsWindow = new BrowserWindow({
        width: 400,
        height: 200,
        title: 'Settings',
    });
    // Load HTML into the BrowserWindow
    settingsWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'html/settings.html'),
        protocol: 'file:',
        slashes: true
    }));

    // GC
    settingsWindow.on('close', function(){
        settingsWindow = null;
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu
    Menu.setApplicationMenu(mainMenu);
}

function startMining(state, address, tempLimit, pool){
    // Change button state
    var button = document.getElementById('start-button');
    button.textContent = 'Stop Mining';

    // Setup parameters
    const hostname = os.hostname()
    if (pool === "flexpool") {
        var p = 'stratum1+ssl://' + address + '.' + hostname + '@eth-us-west.flexpool.io:5555'
    }

    // Declare process and params
    var tempLower = (parseInt(tempLimit)-5).toString()
    var executablePath = "bin/miner.exe";
    var parameters = [
        '-P',
        p,
        '-R',
        '--HWMON',
        '2',
        '--tstop',
        tempLimit,
        '--tstart',
        tempLower,
        '--api-bind',
        '0.0.0.0:8888'
    ];

    // Start/stop mining
    if (state === "Start Mining!") {

        console.log('Starting to mine with the following parameters: ');
        console.log(parameters)
        console.log('Address: ' + address);
        console.log('Temp Limit: ' + tempLower + ' - ' + tempLimit);
        console.log('Pool: ' + pool);
        
        miner = spawn(executablePath, parameters);
        console.log(miner.stdout)
        // child(executablePath, parameters, function(err, data) {
        //     if(err) {
        //         console.error(err);
        //     }
        //     console.log(data.toString());
        // });
        running = true;
        apiCall();

    } else {
        running = false;
        spawn("taskkill", ["/pid", miner.pid, '/f', '/t']);
        console.log('Stopped mining');
        button.textContent = 'Start Mining!';
    }
}

function apiCall() {
    if (running) {
        setTimeout(() => {
            console.log('interval')
            const URL = "http://localhost:8888"; 
            const RpcClient = require('../rpc-client.js');
            const rpc = new RpcClient({ url: URL, debug: true });

            const p = {
                "id": 1,
                "jsonrpc": "2.0",
                "method": "miner_getstatdetail"
            };

            rpc.call(p, console.log);
            apiCall();
        }, 2000)
    }
    
}