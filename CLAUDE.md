# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build**: `npm run build` (TypeScript compilation via `tsc -b`)
- **Test**: `npm test` (Jest with coverage)
- **Run single test**: `npm test <pattern>` (e.g., `npm test schedule`)
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Start**: `npm start` (requires prior build, runs on Raspberry Pi with GPIO access)
- **Release**: `npm release` (uses standard-version with conventional commits)

## Architecture

Firefly is a Raspberry Pi-based LED controller for Mean Well LED drivers with PWM dimming.

### Core Components

- **index.ts**: Entry point - initializes driver, starts API server, subscribes schedule changes to driver
- **driver.ts**: `LedDriver` class wrapping johnny-five/pi-io for GPIO PWM control on GPIO18. Brightness range 26-255 (Mean Well drivers shouldn't dim below 10%)
- **schedule.ts**: `LightSchedule` class that calculates brightness based on time of day:
  - 7am-11am: ramp up 0→255
  - 11am-5pm: full brightness (255)
  - 5pm-9pm: ramp down 255→0
  - 9pm-7am: off (0)
  - Updates every minute, can be paused for temporary overrides
- **api.ts**: Koa HTTP server on port 8080 for GET (current brightness) and POST (temporary override with duration)
- **subscribable.ts**: Base class providing observable pattern with `subscribe()` and `next()` methods

### Key Design Patterns

- Singleton instances exported directly (`driver`, `schedule`, `state`)
- The schedule notifies subscribers on brightness changes; the driver subscribes to schedule updates
- PWM is inverted (255 - intensity) because of how the Mean Well dimming circuit works
