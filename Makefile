clean:
	@rm -f panel-auto-hide.kwinscript

build: clean
	@zip panel-auto-hide.kwinscript -r contents LICENSE metadata.json

uninstall:
	@kwriteconfig5 --file kwinrc --group Plugins --key panelautohideEnabled false
	@qdbus org.kde.KWin /KWin reconfigure
	@-plasmapkg2 -t kwinscript -r panelautohide

install: uninstall build
	@plasmapkg2 -t kwinscript -i panel-auto-hide.kwinscript
	@sleep 1
	@kwriteconfig5 --file kwinrc --group Plugins --key panelautohideEnabled true
	@qdbus org.kde.KWin /KWin reconfigure
	@rm -f panel-auto-hide.kwinscript

debug:
	journalctl -g "js: " -f
