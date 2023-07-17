// utils
function isVerticallyMaximized(client) {
    var area = workspace.clientArea(KWin.MaximizeArea, client);
    return client.height >= area.height;
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

    client.frameGeometryChanged.connect(function() {
        // Your code here
        winPos = client.pos
        winSize = client.size
        console.log("GEOMETRY CHANGED:",client.resourceName,winPos.x,winPos.y,winSize.width,winSize.height)
        var maximized = isVerticallyMaximized(client);
        var currentDesktop = workspace.currentDesktop;
        if (client.desktop == currentDesktop){
            tryDodge(client, maximized, panelLocationsToHide);
        }
    });
}
function isManaged(client) {
    return managed.includes(client);
}

// listeners
function clientAdded(client) {
    tryManage(client);
    var maximized = isVerticallyMaximized(client);
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

var tryDodge = function (client, maximized, panelLocationsToHide) {

    winPos = client.pos
    winSize = client.size
    //console.log("GEOMETRY CHANGED:",client.resourceName,winPos.x,winPos.y,winSize.width,winSize.height)

    windowBottomY = winPos.y + winSize.height
    var area = workspace.clientArea(KWin.MaximizeArea, client);
    areaHeight = area.height;


    var screen = client.screen
    console.log("TOGGLE_PANEL:", client.resourceName.toString(), screen, maximized, panelLocationsToHide)
    let locationsString = panelLocationsToHide.join(",");
    let togglePanelScript = `
    let locations = '${locationsString}'.split(',');
    let fixedPanelHeight=0
    for (var i=0; i < panelIds.length;i++){
        panel = panelById(panelIds[i]);
        if (panel.screen == ${screen} && !locations.includes(panel.location.toString())){
        fixedPanelHeight+=panel.height;
        }
    }

    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (panel.screen == ${screen} && locations.includes(panel.location.toString())) {

            if(${maximized} || ${windowBottomY}-fixedPanelHeight>=${areaHeight}-panel.height) {
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


// workspace.clientMaximizeSet.connect((client, horizontalMaximized, verticalMaximized) => {
//     if (isManaged(client)) {
//         var maximized = isVerticallyMaximized(client);
//         togglePanel(client, maximized, panelLocationsToHide);
//     }
// });

workspace.clientMinimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        // var maximized = isVerticallyMaximized(client);
        togglePanel(client, false, panelLocationsToHide);
    }
});

workspace.clientUnminimized.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        var maximized = isVerticallyMaximized(client);
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
            var maximized = isVerticallyMaximized(client);
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