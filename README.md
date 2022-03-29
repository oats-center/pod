# TODO: What is a Pod?

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

# TODO: POD Hardware

# POD Installation

This guide assumes you have a Linux-based workstation with `podman`, `ssh`, and `bash` installed.
If you only have a Windows-based computer, then you _might_ be able to follow the guide after enabling the "Windows Subsystem for Linux" functionality.
PRs are welcome with more complete Windows instructions.

Note: You can _probably_ replace `podman` with `docker` if you want, but that is generally untested.

## Background: Fedora CoreOS

POD uses Fedora CoreOS (FCOS) Linux distribution because it is a minimal operating system design for running containerized workloads with automatic updates.
In other words, it has the properties one would want for a device that will not see significant manual maintenance.
In turn, FCOS uses [ignition](https://coreos.github.io/ignition/) to automate installation.

At its core, the POD project is a developed ignition configuration.
Ignition files were designed to be ingested by a computer first and written by a human second, and, therefore, use a somewhat terse JSON-based format.
To avoid the error-prone nature of hand-creating ignition files, FCOS maintains [butane](https://coreos.github.io/butane/), a tool that generates the proper JSON from a more human-readable YAML format.
Butane also has other niceties, e.g., automatic encoding of dependency files, validating key names, etc.

### One ignition file per POD

Every POD should have its own ignition file, customized to its specific deployment.
Unfortunately, even though Butane simplifies ignition files, PODs are sufficiently complex that often several edits are required to implement even a single functional change.
To ease that process and limit manual errors, we developed a [jinja](https://jinja.palletsprojects.com/en/3.1.x/) template for the POD butane file.

So the final flow looks like this:

```text

POD template  --[jinja]--> POD Butane --[butane]--> POD Ignition --[FCOS]--> Working POD
(pod.bu.j2)        ^        (pod.bu)                 (pod.ign)
                   |
                   |
              settings.yaml

```

We suggest that you keep at the initial settings file for your records, but **_keep in mind that they contain secrets (passwords, Cloudflare keys, etc.) that you should not expose_**.
Please be sure to store them safely and away from public eyes, e.g., don't push them to your GitHub fork!

## POD Settings

There are a variety of settings that need adjustment per deployment.
For this guide, we will pretend to be installing a POD near the Welch barn at the Purdue Agronomy Center for Research and Education (ACRE) farm
Start by copying the `pod-example.yaml` file to a descriptive name for your deployment (we choose acre-welch.yaml) and edit it.

```bash
cp pods/pod-example.yaml pods/pod-acre-welch.yaml
nvim pods/pod-acre-welch.yaml
```

_Note: `nvim` is **my** favorite editor, but there are other reasonable options: nano, ed, emacs, any graphical text editor, etc. Just use **your** favorite one._

Go ahead and edit your new configuration file to suit your needs.
The file itself has comments for each of the settings and should be sufficient to complete the modifications.

_Important notes:_

- Set `password_hash` based on a password that you will remember!
- Include at least one SSH public key in the `ssh_authorized_keys` field!

Without both of these items, you will not be able to access the POD after the installation is complete.
If you do, the only reasonable recourse is to redo the installation which will result in the loss of all stored data.

## Easy Method:

After creating a POD configuration file, you can use the pre-built `build-installer.sh` script to automatically produce a POD customized FCOS installer.

```sh
./builder-installer.sh pods/pod-acre-welch.yaml /dev/sda
```

Where `/dev/sda` is the device file _on the POD_ which the POD Linux should be installed.
When this command completes, you should have a `pod-acre-welch.iso` file at the root of the project directory.

The step is to copy the ISO file onto a flash drive, so you can install the POD hardware.

```sh
dd if=pod-acre-welch.iso of=/dev/sda status=progress
```

Where `/dev/sda` is the device file path for the flash drive on my computer.

Before removing the flash drive, it is a good idea to sync the file systems with

```sh
sync
```

## Generating a POD specific butane file

First generate the Butane file from the POD settings.

```sh
podman run --rm -it -v "$PWD/:/app":z dcagatay/j2cli pod.bu.j2 acre-welch-settings.yaml > acre-welch.bu
```

## Generating

Next generate the Ignition file

```sh
podman run -i --rm --volume "${PWD}:/pwd":z -w /pwd \
    quay.io/coreos/butane:release --pretty --strict acre-welch.bu > acre-welch.ign
```

# Fetching the Fedora CoreOS installer

You only need to download the installer ISO once, if you already have it please skip this step.

```sh
podman run --security-opt label=disable --pull=always --rm -v .:/data -w /data \
    quay.io/coreos/coreos-installer:release download -s stable -p metal -f iso
```

# Customize the installer: inject the ignition file

```sh
podman run --security-opt label=disable --pull=always --rm -v .:/data -w /data \
    quay.io/coreos/coreos-installer:release iso customize \
    --dest-device /dev/sda \
    --dest-ignition acre-welch.ign \
    -o acre-welch.iso <installer-iso>
```

Where `<installer-iso>` is the name of the installer ISO downloaded in the prior step (for example: fedora-coreos-35.20220227.3.0-live.x86_64.iso).

If the disk on your POD computer will be known by something other than `/dev/sda` be sure to update the command above appropriately.

# Copy customized installer to a flash drive

The last step in preparing the installer to is to copy it onto a bootable flash drive.

Simply insert a flash drive (Note all contents will be destroyed!), and determine it's device file, e.g., look at the `dmesg` output.
On my system, it was `/dev/sda`.

```sh
sudo dd if=acre-welch.iso of=/dev/sda status=progress
```

Before removing the drive, making sure the file system is properly synchronized.

```sh
sync
```

Remove the flash drive.

Ensure your POD computer is connected to the Internet (even if you have to temporarily disconnect the gateway in the process) and boot it with your recently created POD installer drive.

The installation should be fully automatic, and the computer will reboot twice in the process.
Depending on your Internet connection speed, it may have up to 10 minutes after the second reboot for everything to become operational.
When you can access ThingsBoard it is safe to disconnect your Internet source (if needed), re-connect the gateway, and continue with the software configuration steps.

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
