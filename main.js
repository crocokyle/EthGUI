const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu} = electron;

let mainWindow;
let settingsWindow;

// Listen for app to be ready
app.on('ready', function() {
    
    // Create new window
    mainWindow = new BrowserWindow({});

    // Load HTML into the BrowserWindow
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
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
        pathname: path.join(__dirname, 'settings.html'),
        protocol: 'file:',
        slashes: true
    }));

    // GC
    settingsWindow.on('close', function(){
        settingsWindow = null;
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu - comment out for dev menu
    Menu.setApplicationMenu(mainMenu);
}

