clean:
	@rm -f panel-auto-hide.kwinscript

build: clean
	@zip panel-auto-hide.kwinscript -r contents LICENSE metadata.json

uninstall:
	@-plasmapkg2 -t kwinscript -r panelautohide

install: uninstall build
	@plasmapkg2 -t kwinscript -i panel-auto-hide.kwinscript
	@rm -f panel-auto-hide.kwinscript

debug:
	journalctl -g "js: " -f
