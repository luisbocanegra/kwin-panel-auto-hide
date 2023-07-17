// utils
function isMaximized(client) {
    var area = workspace.clientArea(KWin.MaximizeArea, client);
    return client.width >= area.width && client.height >= area.height;
}

// management code
var blacklist = []; // initialized in init()
const always_blacklist = ["plasmashell"]
const managed = [];
const panelLocationsToHide = [];
var useWhitelist;
var hidePanelTop;
var hidePanelBottom;
var hidePanelLeft;
var hidePanelRight;

function tryManage(client) {
    if (always_blacklist.includes(client.resourceName.toString())){
        console.log("BLACKLISTED ",client.caption,client.resourceName.toString(),client.screen,client.maximized);
        return;
    }
    if (useWhitelist) {
        if (!filterList.includes(client.resourceName.toString())) {
            console.log("BLACKLISTED ",client.caption,client.resourceName.toString(),client.screen,client.maximized);
            return;
        }
    } else {
        if (filterList.includes(client.resourceName.toString())) {
            console.log("BLACKLISTED ",client.caption,client.resourceName.toString(),client.screen,client.maximized);
            return;
        }
    }
    console.log("WHITELISTED ",client.caption,client.resourceName.toString(),client.screen,client.maximized);
    managed.push(client);
}
function isManaged(client) {
    return managed.includes(client);
}

// listeners
function clientAdded(client) {
    tryManage(client);
    var maximized = isMaximized(client);
    // if (isManaged(client) && maximized) {
    //     togglePanel(client, maximized);
    // }
}
workspace.clientAdded.connect(clientAdded);

workspace.clientRemoved.connect((client) => {
    if (isManaged(client)) {
        managed.splice(managed.indexOf(client), 1);
    }
});

var togglePanel = function (client, maximized, panelLocationsToHide) {
    var screen = client.screen
    console.log("TOGGLE_PANEL:", client.resourceName.toString(), screen, maximized, panelLocationsToHide)
    let locationsString = panelLocationsToHide.join(",");
    let togglePanelScript = `
    let locations = '${locationsString}'.split(',');
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (panel.screen == ${screen} && locations.includes(panel.location.toString())) {
            // if window is maximized enable autohide
            if(panel.hiding == "none" && ${maximized}) {
                panel.hiding = "autohide";
            } else {
                panel.hiding = "none";
            }
        }
    }`
    callDBus("org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", togglePanelScript);
}

var unhideAllPanels = function (panelLocationsToHide) {
    let locationsString = panelLocationsToHide.join(",");
    console.log("UNHIDE ALL PANELS:")
    let togglePanelScript = `
    locations = '${locationsString}'.split(',');
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (locations.includes(panel.location.toString())) {
            // if window is maximized enable autohide
            if(panel.hiding != "none") {
                panel.hiding = "none";
            }
        }
    }`
    callDBus("org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", togglePanelScript);
}


workspace.clientMaximizeSet.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        var maximized = isMaximized(client);
        togglePanel(client, maximized, panelLocationsToHide);
    }
});

workspace.clientMinimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        // var maximized = isMaximized(client);
        togglePanel(client, false, panelLocationsToHide);
    }
});

workspace.clientUnminimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        var maximized = isMaximized(client);
        togglePanel(client, maximized, panelLocationsToHide);
    }
});

workspace.currentDesktopChanged.connect(() => {
    console.log("")
    console.log("VIRTUAL DESKTOP CHANGED")
    unhideAllPanels(panelLocationsToHide);
    console.log("")
    const clients = workspace.clientList();
    var currentDesktop = workspace.currentDesktop;
    for (var i = 0; i < clients.length; i++) {
        client = clients[i];
        togglePanel(client, false, panelLocationsToHide);
        if (client.desktop == currentDesktop && isManaged(client)){
            var maximized = isMaximized(client);
            togglePanel(client, maximized, panelLocationsToHide);
        }
    }
});


// init
function init() {
    //blacklist = readConfig("blacklist", "yakuake").split(",").filter((name) => name.length != 0);
    filterList = readConfig("FilterClassName", "").split(",").filter((name) => name.length != 0);
    useWhitelist = readConfig("UseWhitelist", false);
    hidePanelTop = readConfig("HidePanelTop", false);
    hidePanelBottom = readConfig("HidePanelBottom", true);
    hidePanelLeft = readConfig("HidePanelLeft", false);
    hidePanelRight = readConfig("HidePanelRight", false);
    console.log("FILTERED WINDOWS:", filterList);
    console.log("PANELS TO HIDE top:", hidePanelTop,"bottom:", hidePanelBottom,"left:", hidePanelLeft,"right:", hidePanelRight);
    if (hidePanelTop) {
        panelLocationsToHide.push('top');
    }
    if (hidePanelBottom) {
        panelLocationsToHide.push('bottom');
    }
    if (hidePanelLeft) {
        panelLocationsToHide.push('left');
    }
    if (hidePanelRight) {
        panelLocationsToHide.push('right');
    }
    console.log("WHITELIST MODE:",useWhitelist);
}

options.configChanged.connect(init);
init();

for (client of workspace.clientList()) {
    clientAdded(client);
}