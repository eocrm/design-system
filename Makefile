PORT := 8080
URL := http://localhost:$(PORT)

.PHONY: up dev build build-lib lint test test-watch install clean help

help:
	@echo "Available targets:"
	@echo "  make up         Start playground dev server at $(URL)"
	@echo "  make dev        Start playground dev server (alias for up)"
	@echo "  make build      Production build (playground — also typechecks library)"
	@echo "  make build-lib  Typecheck the library only"
	@echo "  make test       Run unit tests in the library (Vitest, single run)"
	@echo "  make test-watch Run unit tests in watch mode"
	@echo "  make lint       Stylelint CSS/SCSS in both packages"
	@echo "  make install    Install npm dependencies (sets up workspaces)"
	@echo "  make clean      Remove node_modules, dist, .tsbuildinfo"

up:
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
