// utils
function isMaximized(client) {
    var area = workspace.clientArea(KWin.MaximizeArea, client);
    return client.width >= area.width && client.height >= area.height || client.maximized;
}

// management code
var blacklist = []; // initialized in init()
const always_blacklist = ["plasmashell"]
const managed = [];
var useWhitelist;

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
    managed.push(client.frameId);
}
function isManaged(client) {
    return managed.includes(client.frameId);
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
        managed.splice(managed.indexOf(client.frameId), 1);
    }
});

var togglePanel = function (client, maximized) {
    var screen = client.screen
    console.log("TOGGLE_PANEL:", client.resourceName.toString(), screen, maximized)
    let togglePanelScript = `
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (panel.screen == ${screen} && panel.location=="bottom") {
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

var unhideAllPanels = function () {
    console.log("UNHIDE ALL PANELS:")
    let togglePanelScript = `
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (panel.location=="bottom") {
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
        togglePanel(client, maximized);
    }
});

workspace.clientMinimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        // var maximized = isMaximized(client);
        togglePanel(client, false);
    }
});

workspace.clientUnminimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        var maximized = isMaximized(client);
        togglePanel(client, maximized);
    }
});

workspace.currentDesktopChanged.connect(() => {
    console.log("")
    console.log("VIRTUAL DESKTOP CHANGED")
    unhideAllPanels();
    console.log("")
    const clients = workspace.clientList();
    var currentDesktop = workspace.currentDesktop;
    for (var i = 0; i < clients.length; i++) {
        client = clients[i];
        //togglePanel(client, false);
        if (client.desktop == currentDesktop && isManaged(client)){
            var maximized = isMaximized(client);
            //togglePanel(client, false);
            togglePanel(client, maximized);
        }
    }
});


// init
function init() {
    //blacklist = readConfig("blacklist", "yakuake").split(",").filter((name) => name.length != 0);
    filterList = readConfig("FilterClassName", "").split(",").filter((name) => name.length != 0);
    useWhitelist = readConfig("UseWhitelist", false)
    console.log("WHITELIST MODE:",useWhitelist)
}

options.configChanged.connect(init);
init();

for (client of workspace.clientList()) {
    clientAdded(client);
}