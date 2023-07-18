# Panel Auto Hide

A KWin script that hides Plasma panels when there are maximized windows (all/top/bottom/left/right).

[demo](https://github.com/luisbocanegra/kwin-panel-auto-hide/assets/15076387/254a9bf5-4113-4bc2-b82b-bf7f9e028b90)

## Why? *Why not?*

* I like to have a panel on a clean desktop but to stay away if I maximize
* There is windows can cover but panel still shows behind translucent/blurred windows and I don't like that
* Windows can cover sometimes doesnt show when hovering if maximized windows is present
* Will probably enable me to replicate Latte dock "dodge" option :thought_balloon:

## Some notes

* This had only been tested on single/double monitor setups and can only handle a single window as of now
* **Panel on screen edge between two monitors does not auto hide**, this is a Plasma [BUG:351175](https://bugs.kde.org/show_bug.cgi?id=351175)
* Primary monitor must be the left one!
  > If the right monitor is set as primary it will toggle panels on the opposite screen??? I could not find a solution for this due to my lack of knowledge on how Plasma and KWin scripting work but if someone knows how let me know or open a PR :)
* I am a newbie so expect messy code and bugs :boom:

## Features

### Current

* [x] Configurable which panels to hide (`top`, `bottom`, `left`, `right`)
* [x] Toggles auto hide only on screen with visible maximized window
  * [x] Unhides panel on minimize of maximized window
  * [x] Hides panel on unminimize of maximized window
* [x] Configurable window class blacklist
  * [x] Whitelist mode
* [x] Virtual desktop switching support
* [x] Handle multiple windows minimizing/maximizing
* [x] Multi monitor support
  * [x] Handle windows position relative to the screen they are on
  * [ ] Handle windows switching between screens (`Alt`+`F3`>`Move to Screen`)
* [x] Show on Peek at desktop
* [x] Dodge mode (hide when a window enters panel area)
  * [x] Dodge on panels set to dodge (only for panels with auto-hide enabled)

### May be added

* [ ] Support for multiple windows on screen
  * [ ] Handle tiled windows

### Setup

Just clone the repo. `make` commands have been set up to do all the things.

* `make build` - Build the `.kwinscript` file
* `make clean` - Remove the `.kwinscript` file
* `make install` - Install the script to your Plasma
* `make uninstall` - Uninstall the script from your Plasma
* `make debug` - See `print()` outputs (unfortunately shows all kwin scripts on your system and does not update in real time)

## How does it work (*or at least tries to*)?

1. When a window is created/maximized/unmaximized it gets on which iscreen it is
2. Then calls  `org.kde.plasmashell /PlasmaShell evaluateScript` using `callDBus` with passed screen and maximized state
3. The plasma script loops through all panels
   1. Checks if the panel screen property is the same as the window one
   2. If it is then toggles auto hide depending on the window maximized state

## Contributing

PRs are welcome!

## Credits & Resources

* Based on (but not forked from) [fin444/truely-maximized](https://github.com/fin444/truely-maximized)
* Config ui file was adapted from [zeroxoneafour/polonium](https://github.com/zeroxoneafour/polonium)
* [This tubbadu's reddit comment on how to toggle panels auto hide](https://www.reddit.com/r/kde/comments/zmd2zq/comment/j0q4rks/?utm_source=share&utm_medium=web2x&context=3)
