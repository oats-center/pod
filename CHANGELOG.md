# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
 - Rename `wifi-ap` -> `wifiAp` and `wifi-sta` -> `wifiSta`. System replaces `-` with a hex code in device unit files, which broke `wpa_supplicant` start script.
 - Start/stop `wpa_supplicant` with network device life-cycle rather than on system life-cycle.
 - Use timescale/timescaledb-ha image for pre-installed timescale toolkit
 - Remove nftables opt-in as it is now default
 - Remove ThingsBoard
 - Remove podman-compose (podman containers now managed by systemd)
 - Switch to NATS based MQTT
 - Upgrade to Chirpstack v4.0.2
 - Upgrade to Grafana 9.2.2
 - Upgrade to Cloudflared 2022.10.3
 - Switch stock Postgres to TimeScaleDB 2.8.1 based on Postgres 14

## [1.0.0] - 2022-10-26
### Added
 - Basic POD implementation with Chirpstack v3.0 and ThingsBoard 
