// utils
function isMaximized(client) {
    var area = workspace.clientArea(KWin.MaximizeArea, client);
    return client.height >= area.height && client.width >= area.width;
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

const panelLocationsToDodge = [];
var dodgePanelTop;
var dodgePanelBottom;
var dodgePanelLeft;
var dodgePanelRight;

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
        var maximized = isMaximized(client);
        var currentDesktop = workspace.currentDesktop;
        if (!maximized) {
            if (client.desktop == currentDesktop){
                tryDodge(client, maximized, panelLocationsToHide,panelLocationsToDodge);
            }
        }
    });
}
function isManaged(client) {
    return managed.includes(client);
}

// listeners
function clientAdded(client) {
    tryManage(client);
}
workspace.clientAdded.connect(clientAdded);

workspace.clientRemoved.connect((client) => {
    if (isManaged(client)) {
        managed.splice(managed.indexOf(client), 1);
    }
});

var togglePanel = function (client, maximized, panelLocationsToHide, panelLocationsToDodge) {
    var screen = client.screen
    console.log("TOGGLE_PANEL: Class:", client.resourceName.toString(),"Screen:", screen,"Maximized:" ,maximized)
    let locationsString = panelLocationsToHide.join(",");
    let locationsDodgeString = panelLocationsToDodge.join(",");

    let togglePanelScript = `
    let locations = '${locationsString}'.split(',');
    let locationsDodge = '${locationsDodgeString}'.split(',');

    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        
        // check if the panel is in the current screen
        if (panel.screen == ${screen} && locations.includes(panel.location.toString())) {
            // if window is maximized enable autohide
            if (${maximized}){
                if(panel.hiding != "autohide") {
                    panel.hiding = "autohide";
                }
            } else {
                panel.hiding = "windowsbelow";
            }
        }
    }`
    callDBus("org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", togglePanelScript);
}

function subtractPos(p1, p2) {
    return {x: p1.x - p2.x, y: p1.y - p2.y};
}

var tryDodge = function (client, maximized, panelLocationsToHide,panelLocationsToDodge) {
    // window position relative to screen
    var screen = client.screen
    var screenGeometry = workspace.clientArea(KWin.ScreenArea, screen, 1);
    var topLeft = {x: screenGeometry.x, y: screenGeometry.y};
    var winPos = subtractPos(client.pos, topLeft);
    winSize = client.size
    // window position relative to panels
    windowBottomY = winPos.y + winSize.height
    windowBottomX = winPos.x + winSize.width
    windowTopY = winPos.y
    windowTopX = winPos.x
    
    console.log("TRY_DODGE: Class:", client.resourceName.toString(),"Screen:", screen, "Maximized:",maximized)
    console.log("WINDOW GEOMETRY:","X:",winPos.x,"Y",winPos.y,"W",winSize.width,"H",winSize.height)
    //console.log("SCREEN GEOMETRY:",screenGeometry)
    

    var screenWidth = screenGeometry.width
    var screenHeight = screenGeometry.height;

    //console.log("SCREEN HEIGHT:",screenHeight,"SCREEN WIDTH:",screenWidth);
    let locationsString = panelLocationsToHide.join(",");
    let locationsDodgeString = panelLocationsToDodge.join(",");
    let togglePanelScript = `
    let locations = '${locationsString}'.split(',');
    let locationsDodge = '${locationsDodgeString}'.split(',');
    let topPanelHeight=0;
    let bottomPanelHeight=0;
    let leftPanelHeight=0;
    let rightPanelHeight=0;
    for (var i=0; i < panelIds.length;i++){
        panel = panelById(panelIds[i]);
        //!locations.includes(panel.location.toString())
        if (panel.screen == ${screen}) {
            
            if (panel.location=="top") {
                topPanelHeight+=panel.height;
            } else if (panel.location=="bottom") {
                bottomPanelHeight+=panel.height;
            } else if (panel.location=="left") {
                leftPanelHeight+=panel.height;
            } else if (panel.location=="right") {
                rightPanelHeight+=panel.height;
            }

        }
        
    }
    realAreaHeight = ${screenHeight}
    realAreaWidth = ${screenWidth}
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (panel.screen == ${screen} && locations.includes(panel.location.toString()) && locationsDodge.includes(panel.location.toString())) {
            
            if (panel.location=="bottom") {
                if (${windowBottomY}>realAreaHeight-bottomPanelHeight) {
                    panel.hiding = "autohide";
                } else {
                    //panel.hiding = "none";
                    panel.hiding = "windowsbelow";
                }
            }
            
            if (panel.location=="right") {
                if (${windowBottomX}>realAreaWidth-rightPanelHeight) {
                        panel.hiding = "autohide";
                } else {
                    //panel.hiding = "none";
                    panel.hiding = "windowsbelow";
                }
            }

            if(panel.location=="top") {
                if(${windowTopY}<topPanelHeight) {
                    panel.hiding = "autohide";
                } else {
                    //panel.hiding = "none";
                    panel.hiding = "windowsbelow";
                }
            }

            if(panel.location=="left") {
                if(${windowTopX}<leftPanelHeight) {
                    panel.hiding = "autohide";
                } else {
                    //panel.hiding = "none";
                    panel.hiding = "windowsbelow";
                }
            }
        }
    }`
    callDBus("org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", togglePanelScript);
}

var unhideAllPanels = function (panelLocationsToHide,panelLocationsToDodge) {
    let locationsString = panelLocationsToHide.join(",");
    let locationsDodgeString = panelLocationsToHide.join(",");
    console.log("UNHIDE ALL PANELS:")
    let togglePanelScript = `
    locations = '${locationsString}'.split(',');
    locationsDodge = '${locationsDodgeString}'.split(',');
    for (var i = 0; i < panelIds.length;i++) {
        panel = panelById(panelIds[i]);
        // check if the panel is in the current screen
        if (locations.includes(panel.location.toString())) {

            if(panel.hiding != "windowsbelow") {
                panel.hiding = "windowsbelow";
            }
        }
    }`
    callDBus("org.kde.plasmashell", "/PlasmaShell", "org.kde.PlasmaShell", "evaluateScript", togglePanelScript);
}


workspace.clientMaximizeSet.connect((client, horizontalMaximized, verticalMaximized) => {
    if (isManaged(client)) {
        var maximized = isMaximized(client);
        togglePanel(client, maximized, panelLocationsToHide,panelLocationsToDodge);
    }
});

workspace.clientMinimized.connect((client, horizontalMaximized, verticalMaximized) => {
    console.log("CLIENT MINIMIZED")
    if (isManaged(client)) {
        // var maximized = isMaximized(client);
        togglePanel(client, false, panelLocationsToHide,panelLocationsToDodge);
        reloadPanels();
    }
});

workspace.clientUnminimized.connect((client, horizontalMaximized, verticalMaximized) => {
    console.log("CLIENT UNMINIMIZED")
    if (isManaged(client)) {
        var maximized = isMaximized(client);
        togglePanel(client, maximized, panelLocationsToHide,panelLocationsToDodge);
        reloadPanels();
    }
});

function reloadPanels() {
    const clients = workspace.clientList();
    var currentDesktop = workspace.currentDesktop;
    // keep track of the screens where a maximized window was found,
    // to only toggle panels once per screen and
    // try enabling dodge mode for the rest of windows
    const screens =[]
    const notMaximizedClients = [];
    const MaximizedClients = [];
    for (var i = 0; i < clients.length; i++) {
        client = clients[i];
        // togglePanel(client, false, panelLocationsToHide,panelLocationsToDodge);
        if (client.desktop == currentDesktop && isManaged(client) && !client.minimized){
            var maximized = isMaximized(client);
            if (maximized) {
                //if (!screens.includes(client.screen)) {
                    //screens.push(client.screen)
                MaximizedClients.push(client);
                //}
            } else {
                notMaximizedClients.push(client);
            }
        }
    }
    for (var i = 0; i < notMaximizedClients.length; i++){
        client = notMaximizedClients[i];
        tryDodge(client, false, panelLocationsToHide,panelLocationsToDodge);
    }

    for (var i = 0; i < MaximizedClients.length; i++){
        client = MaximizedClients[i];
        var maximized = isMaximized(client);
        togglePanel(client, maximized, panelLocationsToHide,panelLocationsToDodge);
    }
}

workspace.currentDesktopChanged.connect(() => {
    console.log("")
    console.log("VIRTUAL DESKTOP CHANGED")
    unhideAllPanels(panelLocationsToHide);
    console.log("")
    reloadPanels();
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
    dodgePanelTop = readConfig("DodgePanelTop", false);
    dodgePanelBottom = readConfig("DodgePanelBottom", true);
    dodgePanelLeft = readConfig("DodgePanelLeft", false);
    dodgePanelRight = readConfig("DodgePanelRight", false);
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

    if (dodgePanelTop) {
        panelLocationsToDodge.push('top');
    }
    if (dodgePanelBottom) {
        panelLocationsToDodge.push('bottom');
    }
    if (dodgePanelLeft) {
        panelLocationsToDodge.push('left');
    }
    if (dodgePanelRight) {
        panelLocationsToDodge.push('right');
    }
    console.log("WHITELIST MODE:",useWhitelist);
}

options.configChanged.connect(init);
init();

for (client of workspace.clientList()) {
    clientAdded(client);
}