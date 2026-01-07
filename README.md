# firefly

> Networked Raspberry Pi-based light controller for Mean Well LED drivers.

## Hardware

Requires a Mean Well LED driver with 3-in-1 dimming (PWM/0-10V/resistance). These are the **-B** suffix models (e.g. HLG-240H-48B). The driver's dim+/dim- leads connect to the Raspberry Pi's PWM GPIO and ground.

## Installation

```bash
npm install -g @caseywebb/firefly
sudo firefly
```

To run as a systemd service:

```bash
firefly --install-service
sudo systemctl enable --now firefly
```

## Schedule

Brightness follows a daily schedule based on local time:

| Time       | Brightness                  |
| ---------- | --------------------------- |
| 9pm - 7am  | Off (0)                     |
| 7am - 11am | Gradual ramp up (0 → 255)   |
| 11am - 5pm | Full brightness (255)       |
| 5pm - 9pm  | Gradual ramp down (255 → 0) |

The schedule updates every minute.

## API

A minimal webserver is exposed for retrieving and temporarily overriding the brightness. Overrides pause the schedule for the specified duration (default 15 minutes), after which the schedule resumes.

### Get

```bash
curl localhost:8080
```

### Set

```bash
curl --data '{ "brightness": <0-255>, "duration": <minutes> }' -H "Content-Type: application/json" -X POST localhost:8080
```

## License

MIT
