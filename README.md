# User Guide

- The Purdue OATS DataStation (or POD) is a tool created by Purdue Extension as an aid to farm management. 
- The device on top of the POD is a LoRaWAN gateway that broadcasts a wide-area network that can receive packets of data up to (how many?) miles. It is then wired to a computer that runs Chirpstack, and Thingsboard allows you to manage your devices and visualize your data.

### Notes for location
- PODs can easily be grounded with stakes
- With proper bolts, the tripod can be attached to a roof
- It is recommended that the path from the POD to LoRaWAN devices does not have major obstructions such as buildings or dense forests. This will ensure the best coverage of your devices
### Addition parts
- For ease of use, we recommend using 25ft or 50ft extension cords to give flexibility for installing (https://www.mscdirect.com/product/details/12079810 or  https://www.mscdirect.com/product/details/12079992) and extension cord glands for protection (https://www.amazon.com/dp/B09PY88THM)
- Replacement stakes for ground (https://www.amazon.com/gp/product/B097YC5VMT)
- Replacement box keys (https://altelix.com/door-locking-key-for-np-series-enclosures)
- LoRaWAN devices that we have used: Digital Matter Oyster measures GPS coordinates, speed (https://www.restotracker.com/product/oyster-lorawan/), Digital Matter Sensor Node measures rain bucket, soil moisture, ambient temperature (https://www.restotracker.com/product/sensornode-lorawan/), Tektelic Ag Sensor measures VWC, light, air temp, humidity (https://www.digikey.com/en/products/detail/tektelic-communications-inc/T0005982/13168751)
- All equipment we used to create the POD: https://docs.google.com/spreadsheets/d/1RdSh6an0_30eJKBavOJtFvxdsovLrgQ-GMosSUt1cQ4/edit#gid=1605957806

# TODO: What is a Pod?

... Purdue OATS DataStation (POD) is a gateway on a tripod ...

# TODO: POD Hardware

... PODs are mode of computers and gateways ...

# POD Build Guide

Please read our [POD build guide](./build-guide.md).

# FIXME: Random notes that need a home.

# Accessing gateway UI

By default, the gateway is not public Interface facing;
However, you can access it in two ways (for most gateways):

## SSH

First SSH into the pod.

```sh
$ ssh pod@10.60.0.1
```

Note: You could also use the Cloudflare tunnel if not connected to the local Wi-Fi.

Then, SSH into the gateway from the POD's console

```
ssh root@10.100.0.2
```

Note: Replace `root` if your username is on the gateway.

## Web UI

Gateway web UIs can be accessed directly via an SSH port forward.
While connected to the POD's local Wi-Fi, run the following:

```
ssh -L 8080:10.100.0.2:80 pod@10.60.0.1
```

Where we assume your gateway's UI is running on port 80 (HTTP).
You should see the gateway's UI after visiting `locathost:8080` in your local web browser.

# FIXME:OLD

# LoRaMON is a LoRaWAN MONitor.

Designed to be internet-less first, LoRaMON is a drop-and-go LoRaWAN kit that lowers the bar of getting started with LoRaWAN on your farm.
However, LoRaMON can easily be connected to your farm's Wi-Fi to enable on-the-go and from anywhere access to your data (without the need to store you data on the cloud).

LoRaMON is based on Fedora's CoreOS [...] operating system and utilizes Chripstack [...] and ThingsBoard [...] to manage your LoRaWAN network and visual your data.

# Configuring your networks

There are several approaches to properly configuring your Wi-Fi devices.

1. By default, we use CoreOS's persistent interface naming. This means that the
   Wi-Fi adapter could be replaced with any USB Wi-Fi adapter and the box would
   box as work as expected. However, it has the downside of needing to learn
   what the interface name is first. We tend to boot the CoreOS live image,
   use `ip a` to determine the interface names, edit the ign file, and then
   start the installer.

2. Deploy a systemd-udev link file that renames the interface based on its
   MAC address to a fixed and known name. This means the configuration works
   out of the box, however, it will have to be manually updated if the adapter
   is ever replaced.

# Steps to install

1. Set BIOS to start on power on

# Configuring the Gateway

Set the gateway to a static IP address in the `10.100.0.1/24` range (`10.100.0.2` is a perfectly fine choice).
Point the gateway's `chripstack-gateway-bridge` to `10.100.0.1`

## Optional functions

### Cloudflare Tunnels

All POD's network services are only accessible by computers connected to the same network.
That could be a computer or mobile device connected to the POD's local Wi-Fi network or a device connected to the same Wi-Fi network that the POD connects.
In other words, the data stored on a POD can not be accessed from the Internet, even if the POD has Internet access.

Cloudflare tunnels fix that.
Through the use of a Cloudflare tunnel, the POD services can be accessed from anywhere in the world via the Internet in a selected and controlled way.
For example, you could expose ThingsBoard which would allow you to view your data, after entering your username and password, from anywhere.
Chripstack, monitoring services, and SSH can also be exposed to afford easier device management, software upgrading, and real-time POD monitoring.

This optional feature can be enabled in the POD configuration file and does require a free Cloudflare account that manages a private domain.
Please consult the configuration file and the Cloudflare website for more details.

### Monitoring

Built into the PODs is some simple monitoring functionality that can be disabled as it is not required for LoRaWAN to function.
This feature leverages [Prometheus](https://prometheus.io/) to collect metric data about the computer, Chirpstack, and ThingsBoard.
We utilize [Grafana](https://grafana.com/) to display the data.

The metrics can be protected behind the local network or exposed to the Internet through a Cloudflare tunnel.
In either case, a Grafana dashboard username and password protect accessing the metric data.

These options are set in the POD configuration file.
