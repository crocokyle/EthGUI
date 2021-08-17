const electron = require('electron');
const url = require('url');
const path = require('path');
var child = require('child_process').exec;
var spawn = require('child_process').spawn;

const {app, BrowserWindow, Menu} = electron;

let mainWindow;
let settingsWindow;
var miner;

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
    if (pool === "flexpool") {
        var p = 'stratum1+ssl://' + address + '.3080@eth-us-west.flexpool.io:5555'
    }

    // Declare process and params
    var executablePath = "bin/miner.exe";
    var parameters = [
        '-P',
        p,
        '-R',
        '--HWMON',
        '2',
        '--api-bind',
        '0.0.0.0:8888'
    ];

    // Start/stop mining
    if (state === "Start Mining!") {

        console.log('Starting to mine with the following parameters: ');
        console.log('Address: ' + address);
        console.log('Temp Limit: ' + tempLimit);
        console.log('Pool: ' + pool);
        
        miner = spawn(executablePath, parameters);
        console.log(miner.stdout)
        // child(executablePath, parameters, function(err, data) {
        //     if(err) {
        //         console.error(err);
        //     }
        //     console.log(data.toString());
        // });

    } else {
        spawn("taskkill", ["/pid", miner.pid, '/f', '/t']);
        console.log('Stopped mining');
        button.textContent = 'Start Mining!';
    }
}

