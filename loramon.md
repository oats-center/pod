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
