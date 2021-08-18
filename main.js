const electron = require('electron');
const url = require('url');
const path = require('path');
var child = require('child_process').exec;
var spawn = require('child_process').spawn;
var os = require('os');
const net = require('net');

const {app, BrowserWindow, Menu} = electron;

let mainWindow;
let settingsWindow;
var miner;
var running;
var refreshRate = 5000;
var socketClient;
var hashrateDeque = [0];
var hrChart;
var tempChart;
var shareChart;

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
    // Open dev tools by default
    
    // Create dev tools menu
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

    var button = document.getElementById('start-button');
    var addressBox = document.getElementById('address-box');
    var poolBox = document.getElementById('pool-selection');
    var tempBox = document.getElementById('temp-limit');

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
        // Update UI Elements
        // Init charts
        initCharts()

        button.textContent = 'Stop Mining';
        addressBox.disabled = true;
        poolBox.disabled = true;
        tempBox.disabled = true;

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

        // Update UI Elements
        button.textContent = 'Start Mining!';
        addressBox.disabled = false;
        poolBox.disabled = false;
        tempBox.disabled = false;
    }
}

function initCharts() {
    var Chart = require('chart.js');
    if (hrChart) {hrChart.destroy()}
    hrChart = new Chart(document.getElementById("hashrate-chart"), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{ 
            data: [0],
            label: "Total Hashrate",
            borderColor: "#3e95cd",
            fill: true,
            tension: 0.4
        }
        ]
    },
    options: {
        radius: 0,
        scales: {
            y: {
                min: 0,
            }
        },
        title: {
        display: true,
        text: 'World population per region (in millions)'
        }
    }
    });
    if (tempChart) {tempChart.destroy()}
    tempChart = new Chart(document.getElementById("temp-chart"), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ 
                data: [],
                label: "GPU Temp",
                borderColor: "#eb4034",
                fill: true,
                tension: 0.4
            },
            { 
                data: [],
                label: "GPU Temp Limit",
                borderDash: [5, 5],
                borderColor: "#db5f00",
                fill: true
            }
            ]
        },
        options: {
            // scales: {
            //     y: {
            //         min: 0,
            //     }
            // },
            radius: 0,
            title: {
            display: true,
            text: 'World population per region (in millions)'
            }
        }
        });
    if (shareChart) {shareChart.destroy()}
    shareChart = new Chart(document.getElementById("doughnut-chart"), {
        type: 'doughnut',
        data: {
        labels: ["Valid Shares", "Stale Shares", "Invalid Shares"],
        datasets: [
            {
            label: "Population (millions)",
            backgroundColor: ["#3cba9f", "#fcba03","#fc0303"],
            data: [541,31,3]
            }
        ]
        },
        options: {
        title: {
            display: true,
            text: 'Shares submitted to the pool.'
        }
        }
    });
}


function apiCall() {
    if (running) {
        setTimeout(() => {
            
            // Send the request
            request = '{"id":1,"jsonrpc":"2.0","method":"miner_getstatdetail"}'
            socketClient = net.connect({host:'localhost', port:8888},  () => {              
                socketClient.write(request + '\r\n');
            });
        
            // Listen for the response
            var response;
            socketClient.on('data', (data) => {
                response = JSON.parse(data).result;
                updateUI(response);
                socketClient.end();
            });

            // On disconnect
            socketClient.on('end', () => {
                //console.log('Disconnected from API');
            });

            // On error
            socketClient.on("error", (err) => {
                console.log("Caught flash policy server socket error: ")
                console.log(err.stack)
            });

            apiCall();
        }, refreshRate)
    }   
}

function updateLineChart(chart, data, maxlength) {
    // Add hashrate to our deque
    chart.data.labels.push(getTime())
    var i = 0;
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data[i]);
        i++;
    });
    // Remove old hashrates
    if (chart.data.datasets[0].data.length > maxlength) {
        chart.data.datasets[0].data.shift();
        chart.data.labels.shift();
    }
    chart.update()
}

function updateUI(data) {
    var hashrate = parseInt(data.mining.hashrate);
    var gpuTemp = data.devices[0].hardware.sensors[0]
    var memTemp = data.devices[0].hardware.sensors[3]
    var tempLimit = document.getElementById('temp-limit').value;

    console.log('Hashrate: ' + hashrate)
    if (hashrate) {
        document.getElementById('hashrate').textContent = hashrate;
        updateLineChart(hrChart, [hashrate], 300);
    }
    if (gpuTemp) {

        document.getElementById('gpu-temp').textContent = gpuTemp;
        updateLineChart(tempChart, [gpuTemp, tempLimit], 300)
        console.log(data)
    }
}


function getTime() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;

    return strTime;
}