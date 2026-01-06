# firefly

> Networked Raspberry Pi-based light controller for Mean Well LED drivers.

## Hardware

Requires a Mean Well LED driver with 3-in-1 dimming (PWM/0-10V/resistance). These are the **-B** suffix models (e.g. HLG-240H-48B). The driver's dim+/dim- leads connect to the Raspberry Pi's PWM GPIO and ground.

## Installation

```bash
yarn global add @caseywebb/firefly
sudo firefly
```

Optionally copy the systemd unit file to `/etc/systemd/system/firefly.service` and run:

```bash
sudo systemctl start firefly && sudo systemctl enable firefly
```

## API

A minimal webserver is exposed for retrieving and temporarily overriding the brightness.

### Get

```bash
curl localhost:8080
```

### Set

```bash
curl --data '{ "brightness": <1-255> }' -H "Content-Type: application/json" -X POST localhost:8080
```

## License

MIT
