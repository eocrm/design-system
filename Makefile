PORT := 8080
URL := http://localhost:$(PORT)

# Detect a browser opener for the current environment.
# Order matters: wslview is right on WSL where xdg-open/open also exist as shims.
BROWSER := $(shell command -v wslview 2>/dev/null || command -v xdg-open 2>/dev/null || command -v open 2>/dev/null)

.PHONY: up dev build build-lib lint test test-watch install clean help

help:
	@echo "Available targets:"
	@echo "  make up         Start playground dev server and open $(URL)"
	@echo "  make dev        Start playground dev server only"
	@echo "  make build      Production build (playground — also typechecks library)"
	@echo "  make build-lib  Typecheck the library only"
	@echo "  make test       Run unit tests in the library (Vitest, single run)"
	@echo "  make test-watch Run unit tests in watch mode"
	@echo "  make lint       Stylelint CSS/SCSS in both packages"
	@echo "  make install    Install npm dependencies (sets up workspaces)"
	@echo "  make clean      Remove node_modules, dist, .tsbuildinfo"

up:
ifeq ($(BROWSER),)
	@echo "→ no browser opener found — install 'wslu' (WSL) or use xdg-open/open"
	@echo "→ open $(URL) manually once Vite reports 'ready'"
else
	@echo "→ will open $(URL) in your browser once Vite is ready"
	@( sleep 2 && "$(BROWSER)" "$(URL)" >/dev/null 2>&1 ) &
endif
	@npm run dev

dev:
	@npm run dev

build:
	@npm run build

build-lib:
	@npm run build:lib

test:
	@npm test

test-watch:
	@npm run test:watch -w @eocrm/design-system

lint:
	@npm run lint:css

install:
	@npm install

clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist packages/*/.tsbuildinfo dist
