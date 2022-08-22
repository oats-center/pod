# Purdue OATS DataStation (POD) Installation Guide

This guide assumes you have a Linux-based workstation with `podman`, `ssh`, and `bash` installed.
If you only have a Windows-based computer, then you _might_ be able to follow the guide after enabling the "Windows Subsystem for Linux" functionality.
PRs are welcome with more complete Windows instructions.

Note: You can _probably_ replace `podman` with `docker` if you want, but that is generally untested.

You will also need a computer with a web-browser that is either on the same network as the POD, or, if using Cloudflare tunnels, one that has access to the Internet.

## Background

### Operating system: Fedora CoreOS

POD uses the Fedora CoreOS (FCOS) distribution for its minimal operating system focused on running containerized workloads.
In other words, it is a good fit for a device that will not see significant manual maintenance.
As an added bonus, FCOS uses [ignition](https://coreos.github.io/ignition/) to automate installations, making deploying PODs quite easy.

### Automated install

At its core, the POD project is essentially a developed ignition configuration.
Unfortunately, ignition files are hard to work with because they use a somewhat terse JSON-based format optimized for machine consumption.
To avoid the error-prone nature of hand-crafting ignition files (particularly complex ones like a POD), FCOS maintains [butane](https://coreos.github.io/butane/).
Butane is a tool that generates proper JSON from a more human-readable YAML format while also incorporating other niceties, such as, automatic encoding of dependency files, validating key names, etc.

### Every POD has its own installer

Every POD should have its own installer, customized to the specific needs/requirements of the deployment.
Unfortunately, even though Butane simplifies ignition files, PODs are sufficiently complex that often several edits are required to implement even a single functional change.
To ease that process we created a [jinja](https://jinja.palletsprojects.com/en/3.1.x/) template over the stock POD butane file.

The flow of installing the POD software is this:

```text

POD template  --[jinja]--> POD Butane --[butane]--> POD Ignition --[FCOS Installer]--> Copy FCOS and ignition to disk --[Reboot]--> Install FCOS and POD Software --[Rebot]--> Download/start POD containers --> Working POD
(pod.bu.j2)        ^        (pod.bu)                 (pod.ign)                                 (automatic)                                  (automatic)                                 (automatic)
                   |
                   |
              settings.yaml
```

We suggest that you keep all POD settings files for your records, but **_keep in mind that they contain secrets (passwords, Cloudflare keys, etc.) that you should not expose_**.
Please be sure to store them safely and away from public eyes, e.g., don't push them to a GitHub fork!

# Install Guide

## Background

There are a variety of settings that can be adjusted per deployment--some required and others the default is likely sufficient.
For the purposes of this guide, we will pretend to be deploying a POD near the Welch barn at the Purdue Agronomy Center for Research and Education (ACRE) farm.
The POD software is running on a Dell mini-computer, the gateway (RAK 7289) is hardware via Ethernet to the computer, and the gateway is powered via PoE.
We have two Wi-Fi devices, one an Alfa AWUS036ACHM used as an AP and one Panda Wireless PAU03 used as a station/client.

## Creating the installer

### 1. Create a POD settings file

Start by copying `pod-example.yaml` to a new file with a descriptive name, e.g., acre-welch.yaml.
Then edit it with your favorite editor, using the built-in comments as a guide.

For example:

```bash
cp pod-example.yaml pods/pod-acre-welch.yaml
nvim pods/pod-acre-welch.yaml
```

_Note: `nvim` is **my** favorite editor, but nano, ed, emacs, any graphical text editor, etc. will work just fine._

**Important notes:**

- Set `password_hash` based on a password that you will remember!
- Include at least one SSH public key in the `ssh_authorized_keys` field!

Without both of these items, you will not be able to access the POD after the installation is complete.
If you do forget them, the only reasonable recourse is to redo the installation which will result in the loss of stored data.

### 2. Build the installer

With a finalized settings file, use the `build-installer.sh` script to produce a customized FCOS installer image.

You will need to know the device file of the hard drive on _the POD computer_.
In our case--which is pretty typical--we have a single SATA drive, so, the device file will be `/dev/sda`.
If you are unsure, you could try guessing `/dev/sda` and if the installer fails, drop to the console and use `lsblk` to discover the correct name.
At which point you would need to recreate the installer with the correct device file.

The `builder-installer.sh` script takes two command line parameters:

```sh
./scripts/builder-installer <path-to-settings> <device-file-of-hard-drive>
```

For the Welch POD we ran:

```sh
./scripts/builder-installer.sh pods/pod-acre-welch.yaml /dev/sda
```

The command will create an ISO image in the `build` folder.
For us, it was `build/pod-acre-welch.iso`.

### 3. Copy the installer to a flash drive

The final step to producing an installer, is copying the ISO image to a flash drive (or other bootable medium).

`dd` is a good tool for this job, but if you have another preferred method is to should be fine too.

For the Welch POD, we ran:

```sh
sudo dd if=build/pod-acre-welch.iso of=/dev/sda status=progress
```

Where `/dev/sda` was the device file path for _the flash drive on my computer_.

Before removing the flash drive, it is a good idea to sync the file systems with

```sh
sync
```

## Booting the installer

Booting the installer is quite easy.

### 1. Internet

Ensure that your POD computer is connected to the Internet (even if you have to temporarily disconnect the gateway to do so).
The Internet is not strictly needed after the installer is complete, but it is required at install time to download the necessary software.

### 2. Configure BIOS

During the early boot process you should be presented with an option to edit BIOS settings.
Often you are required to hit the F10, F2, F12, F1, or DEL, but it could be different for your device.

While in BIOS we suggest you review all settings, but in particular:

- Set power settings to turn the computer on with applied AC (turn on automatically once plugged in).
- Set the boot order to first boot the internal hard drive and then USB devices.

### 3. Boot the installer

Insert the installer USB drive (or other bootable medium) into the POD computer and turn on it on (or just exit BIOS if still there).
During the early boot phase, look for a "boot menu" option.
Again you will likely have to hit one of F10, F2, F12, F1, or DEL keys at the right moment.
Select the POD installer from the list.

### 4. Wait and you're done!

From this point forward, the installation should fully automatic and the system will be configured based on your settings YAML file.
The computer will reboot twice during the installation process, and you should ensure the Internet stays connected the entire time.

After the second reboot, you should see your POD Wi-Fi network.
Connect to this network, and visit 10.60.0.1 in your browser.
It will likely not work correct at first, but refresh every few minutes.
When you see the ThingsBoard login screen appear, you know the installation is complete.

You can now remove the Internet connection, reconnect the gateway (if needed), and proceed to gateway configuration.

## Gateway configuration

Every gateway is configured in a slightly different way.
You will need to consult your gateway's instructional manual for specific instructions.

However, there are a few settings that you must ensure are correct:

1. Ethernet interface is set to as static with:
   - IP: `10.100.0.2`
   - Netmask `255.255.255.0`
   - Default Gateway `10.100.0.1`
2. LoRaWAN subband should be set equal to what was set in the POD settings. (Our default: `subband 2 (channel 8 - 15, 65)`)
3. Configure the gateway for packet forwarding with Chirpstack gateway bridge (MQTT/Chirpstack 3.0/Protobuf) to:
   - MQTT broker: `10.100.0.1`
   - MQTT port: `1883`
   - Protocol: `Protobuf` / `Chirpstack 3.x`
   - Uplink MQTT topic: `gateway/{{eui}}/event/up`
   - Downlink MQTT topic: `gateway/{{eui}}/command/down`
   - Downlink acknowledge MQTT topic: `gateway/{{eui}}/event/ack`
   - Gateway statistic MQTT topic: `gateway/{{eui}}/event/stats`

Note: if your gateway does not already have the Chirpstack gateway bridge running on it, you may check for [installation instructions](https://www.chirpstack.io/gateway-bridge/gateway/).
Otherwise, you will need to install the Chirpstack gateway bridge onto the POD computer and configure the `lora_pkt_fwd` software talk with it.
Most gateways should be capable of running the gateway bridge directly.

### Accessing the gateway

Some gateways broadcast their own Wi-Fi network for the purpose of accessing the shell or a web configuration UI.
The easiest way to configure the gateway would be to simply connect to that Wi-Fi.

However, if your gateway does not have such a feature, or if you are out of range of it, you have additional options:

#### SSH

If your gateway supports SSH, then you can access it by first SSHing into the POD computer.

- If you are connected to the POD Wi-Fi network, then jump through the POD computer with:

  ```sh
  ssh -J <pod-username>@10.60.0.1 <gw-username>@10.100.0.2
  ```

  from a host with an authorized ssh key.

  For example, when connected to the `pod-acre-welch` network, we can SSH into the gateway with:

  ```sh
  ssh -J pod@10.60.0.1 root@10.100.0.2
  ```

- If you are using Cloudflare tunnels, then you can do the jump over the Internet from anywhere with:

  ```sh
  ssh -J <pod-username>@<cloudflare-ssh-tunnel> <gw-username>@10.100.0.2
  ```

  from a host with an authorized ssh key.

  For example, we can remotely SSH into the Welch gateway with:

  ```sh
  ssh -J pod@pod-acre-welch-ssh.oatscenter.org root@10.100.0.2
  ```

_Note: these commands assume you have set your gateway is already properly configured to use the static IP of 10.100.0.2.
For the initial configuration, you may have to follow your gateway's manual which could include connecting it directly to your computer._

#### Web UI

Some gateways, the like RAK 7289, have convenient web-based interfaces for configuration them.
In that case, you can use SSH port forwarding to access the website locally on your computer.

- If you are connected to the POD Wi-Fi network, then port forward through the POD computer with:

  ```sh
  ssh -L 8080:10.100.0.2:<port-of-gateway-website> <pod-username>@10.60.0.1
  ```

  from a host with an authorized ssh key. Likely the gateway website port is either 80 or 443.

  For example, when connected to the `pod-acre-welch` network, we can use

  ```sh
  ssh -L 8080:10.100.0.2:80 pod@10.60.0.1
  ```

- If you are using Cloudflare tunnels, then you can port forward over the Internet from anywhere with:

  ```sh
  ssh -L 8080:10.100.0.2:<port-of-gateway-website> <pod-username>@<cloudflare-ssh-tunnel>
  ```

  from a host with an authorized ssh key. Likely the gateway website port is either 80 or 443.

  For example, we can remotely access the Welch gateway's UI with:

  ```sh
  ssh -L 8080:10.100.0.2:80 pod@pod-acre-welch-ssh.oatscenter.org
  ```

With the SSH session active, you can access the web UI by visiting `localhost:8080` in your computer's browser.

## Chirpstack configuration

Chirpstack can be accessed in one of two ways:

- If you are connected to the POD Wi-Fi, then visit `10.60.0.1:8080` in your browser.
- If you use Cloudflare tunnels, then visit your Chripstack tunnel URL.
  - For example, `pod-acre-welch-cs.oatscenter.org`

### Change the default login

The default username and password is: `admin / admin`.
We recommend that you at least change the password, particularly if you are using Cloudflare tunnels.
This can be done by clicking the word `admin` in the top right corner of the screen and choosing `change password`.
You may change it to whatever you want, but don't forget it!

### Adding the network server

There is a Chirpstack network server already running on the POD.
In future version of Chirpstack, this may not be required, but at the time of this writing you must manually add the network server record through the web UI.
To do this, select `Network-servers` from the left menu panel, and choosing `+ ADD`.
Please use these settings:

- Network-server name: `POD Network Server`
- Network-server server: `network-server:8000`

You can leave the defaults on the other two tabs.
Hit `ADD NETWORK-SERVER`.

### Creating a service profile

A service profile sets some standard LoRaWAN parameters for your network.
You can add one by selecting `Service-profiles` from the left menu panel, and choosing `+ CREATE`.
Please use these settings:

- Service-profile name: `POD Profile`
- Network-server: Choose `POD Network Server`
- Check "Add gateway meta-data"
- Device-status request frequency: `1`
- Check "Report device battery level to application-server"
- Check "Report device link margin to application-server"
- Minimum allowed data-rate: `0`
- Maximum allowed data-rate: `4` (Assuming United States)
- Uncheck "Private gateways"

Hit `CREATE SERVICE-PROFILE`

### Adding the POD gateway

Gateways are Chripstack records of the physical gateways that the network server should work with.
You can add one by selecting `Gateways` from the left menu panel, and choosing `+ CREATE`.
Please use these settings:

- Gateway name: Something that uniquely identifies the gateway. For our RAK 7289 we used `RAK7289C_4D65`.
- Gateway description: We used `RAK7289 Gateway attached to POD`
- Gateway ID: Your gateway manual should describe how to locate this.
- Network-server: Choose `POD Network Server`
- Service-profile: Choose `POD Profile`
  Leave the rest of the settings at their default and hit `CREATE GATEWAY`.

After a few minutes, refresh the "Gateways" page until the `Last seen` column as a time or `a few seconds ago` rather than `Never`.

### Create device profile: Digital Matter Oyster

Create a device profile by selecting "Device-profiles" from the left panel menu, and hitting `+ CREATE`.
Please use these settings:

GENERAL tab:

- Device-profile name: `Digital Matters Oyster`
- Network-server: Choose `POD Network Server`
- LoRaWAN MAC version: `1.1.0`
- LoRaWAN Regional Parameters revision: `A`
- ADR Algorithm: `Default ADR algorithm (LoRa only)`
- Max EIRP: `17`
- Uplink interval: `3600`

JOIN (OTAA / ABP) tab:

- Select "Device supports OTAA"

CODEC tab:

- Payload codec: `Custom JavaScript codec functions`
- Copy and past the code [from here](https://raw.githubusercontent.com/oats-center/pod/master/codecs/digital_matters_oyster.js) input the "Decode" textbox.
- Leave the "Encode" textbox as the default.

Hit `CREATE DEVICE-PROFILE`

### Create device profile: Rain Guage (DM SensorNode)

Create a device profile by selecting "Device-profiles" from the left panel menu, and hitting `+ CREATE`.
Please use these settings:

GENERAL tab:

- Device-profile name: `Rain Gauge (DM SensorNode)`
- Network-server: Choose `POD Network Server`
- LoRaWAN MAC version: `1.1.0`
- LoRaWAN Regional Parameters revision: `A`
- ADR Algorithm: `Default ADR algorithm (LoRa only)`
- Max EIRP: `20`
- Uplink interval: `3600`

JOIN (OTAA / ABP) tab:

- Select "Device supports OTAA"

CODEC tab:

- Payload codec: `Custom JavaScript codec functions`
- Copy and past the code [from here](https://raw.githubusercontent.com/oats-center/pod/master/codecs/digital_matters_sensor_node_rain_soil_temp.js) input the "Decode" textbox.
- Leave the "Encode" textbox as the default.

Hit `CREATE DEVICE-PROFILE`

### Create device profile: Tektelic Ag Sensor

Create a device profile by selecting "Device-profiles" from the left panel menu, and hitting `+ CREATE`.
Please use these settings:

GENERAL tab:

- Device-profile name: `Tektelic Ag Sensor`
- Network-server: Choose `POD Network Server`
- LoRaWAN MAC version: `1.0.4`
- LoRaWAN Regional Parameters revision: `A`
- ADR Algorithm: `Default ADR algorithm (LoRa only)`
- Max EIRP: `23`
- Uplink interval: `3600`

JOIN (OTAA / ABP) tab:

- Select "Device supports OTAA"

CODEC tab:

- Payload codec: `Custom JavaScript codec functions`
- Copy and past the code [from here](https://raw.githubusercontent.com/oats-center/pod/master/codecs/tektelic_ag_sensor.js) input the "Decode" textbox.
- Leave the "Encode" textbox as the default.

Hit `CREATE DEVICE-PROFILE`

### Create your POD application

Applications in Chirpstack hold a set of devices to communicate with.
They also control how the received device data is set to integrated systems, like Thingsboard.

To create an application, go to Applications from the left panel menu, and select `+ CREATE`.
Please use these settings:

- Application name: `POD-Kit`
- Application description: `POD Kit Sensors`
- Service-profile: `POD Profile`

Select `CREATE APPLCATION`

Add Thingsboard integration
- Go to the Integrations tab within `POD-Kit`
- Under Thingsboard.io click `ADD`
- For the thingsboard.io server use `http://thingsboard:9090`
- Click `Update Integration` 


### Add device: Tektelic Ag Sensor

You will need the physical device and its EUI and application key of the Ag Sensor.
This is usually in printed as a label in the box.

To create a device, start on the relevant application page and select `+ CREATE`.
Please use these settings:

- Device name: `Surface-Ag-XXXX` (where XXXX is the last four digital of the device ID, which makes it easier to locate later.)
- Device description: `Tektelic Ag Sensor`
- Device EUI: From the manufactures label
- Device profile: `Tektelic Ag Sensor`

Client `Create`

- Application key: From the manufactures label

With the device added into Chirpstack, use the provided magnet to turn on the device as described in the device manual.
After a few moments, the "Last seen" column should show a time or `a few seconds ago` that indicates the devices connected.

You can configure the sensor for a different sample rate by sending it a LoRaWAN downlink.
The device manual provides more details.
By default, the device will:

- Send battery voltage once per day,
- Send ambient temperature once per 15 mins,
- Send ambient relative humidity once per 15 mins,
- Send ambient soil moisture once per 15 mins,
- Send ambient soil temperature once per 15 mins,
- Send ambient light once per 15 mins,

### Add device: Digital Matters Oyster

You will need the physical device and its EUI, network key, and the application key of the Oyster.
This can be found on a label in the Oyster box as well as easily copy and pasted from the Digital Matters oyster configuration tool.

#### Configure the Oyster

1. Install the [Digital Matters configuration tool](https://support.digitalmatter.com/support/solutions/articles/16000069244-oyster-lorawan-config-app)
2. Connect the Digital Matters debug cable to Oyster and to your computer.
3. Start the configuration tool, and select the COM port associated with the debug cable.
4. Download the [Oyster configuration](https://raw.githubusercontent.com/oats-center/pod/main/digital-matter-parameters/oyster), load it into the configuration app, and adjust as needed.
5. Check the `Program Parameters` checkbox.
6. Plug the debug cable into the Oyster.
7. Insert batteries.
8. Wait until the new parameters have been installed.
9. Open the `DevEUI List` screen and copy the device EUI and both network and session keys to a safe place.

To create the device within Chirpstack, go to the relevant application page and select `+ CREATE`.
Please use these settings:

- Device name: `Oyster-XXXX` (where XXXX is the last four digital of the device ID, which makes it easier to locate later.)
- Device description: `Digital Matters Oyster`
- Device EUI: From the manufactures label and/or configuration app
- Device profile: `Digital Matters Oyster`

Client `Create`

- Application key: From the manufactures label and/or configuration app.
- Network key: From the manufactures label and/or configuration app.

**Access token will be added in the Thingsboard section under "Add Devices"**

With the device added into Chirpstack, power cycle the device by pulling the batteries, waiting 10 seconds, and then re-inserting.
After a few moments, the "Last seen" column should show a time or `a few seconds ago` that indicates the devices connected.

### Add device: Rain Gauge

You will need the physical device and its EUI, network key, and the application key of the sensor node.
This can be found on a label in the Oyster box as well as easily copy and pasted from the Digital Matters oyster configuration tool.

#### Configure the Digital Matter Sensor Node

1. Install the [Digital Matters configuration tool](https://support.digitalmatter.com/support/solutions/articles/16000093348-sensornode-lorawan-configuration-and-usage-guide)
2. Connect the Digital Matters debug cable to Sensor Node and to your computer.
3. Start the configuration tool, and select the COM port associated with the debug cable.
4. Download the [Rain Gauge Sensor Node configuration](https://raw.githubusercontent.com/oats-center/pod/main/digital-matter-parameters/sensor-node), load it into the configuration app, and adjust as needed.
5. Check the `Program Parameters` checkbox.
6. Plug the debug cable into the Sensor Node.
7. Insert batteries.
8. Wait until the new parameters have been installed.
9. Open the `DevEUI List` screen and copy the device EUI and both network and session keys to a safe place.

To create the device within Chirpstack, go to the relevant application page and select `+ CREATE`.
Please use these settings:

- Device name: `Rain-Gauge-XXXX` (where XXXX is the last four digital of the device ID, which makes it easier to locate later.)
- Device description: `Digital Matters sensor node w/ rain gauge, air temperature, soil moisture`
- Device EUI: From the manufactures label and/or configuration app
- Device profile: `Rain Gauge (DM SensorNode)`

Client `Create`

- Application key: From the manufactures label and/or configuration app.
- Network key: From the manufactures label and/or configuration app.

With the device added into Chirpstack, power cycle the device by pulling the batteries, waiting 10 seconds, and then re-inserting.
After a few moments, the "Last seen" column should show a time or `a few seconds ago` that indicates the devices connected.

## Thingsboard

### Creating Tenant
- Login to thingsboard username: sysadmin@thingsboard.org password: sysadmin
- Go `Tenants` tab, select `Tenant`, and delete it
- Select the `+` sign, name the new tenant `Tenant`
- Click on the tenant you just created and select to `Manage Tenant Admin`
- Add tenant user as tenant@xxxxxxx.xxx (xxxxxxx.xxx is the website domain)
- Select user and go to `Display activation link`
- Copy the link to a new browser to create the password for the new tenant

### Adding Customer(s)
- Go `Customers` tab, select the `+` sign, make the title `POD` and click add
- Click on the new customer named `POD`, select `Manage users`
- Select the `+` sign, add your email (or client`s email) as name@xxxxxxx.xxx (xxxxxxx.xxx is the website domain)
- Click on the user you've just created and hit `Display activation link`
- Copy the link to a new browser to create the password for the new customer. You will now be logged in as that user. For the next step, log back in as the tenant.

### Importing Device Profiles
- Download all device profiles
+ [Oyster](https://github.com/oats-center/pod/blob/main/thingsboard-files/Device%20Profiles/digital_matter_oyster.json)
+ [Rain Gauge](https://github.com/oats-center/pod/blob/main/thingsboard-files/Device%20Profiles/rain_gauge_soil_moisture_temperature.json)
+ [Ag Sensor](https://github.com/oats-center/pod/blob/main/thingsboard-files/Device%20Profiles/tektelic_ag_sensor.json)
- Log back in a tenant user (tenant@xxxxxxx.xxx)
- Go to `Device profiles` tab, select the `+` sign, select `Import device profiles`

### Importing Rule Chains
- Download Rule Chains
- Go to Rule Chains tab, select the `+` sign, click on `Import rule chain`
- Import `Rain Tracking` confirm changes, click check mark
- Import `POD Root`, go to the very right side of the rule chain and click on node `rule chain` named `Rain tracking` (will be purple), select the pencil, in the Rule chain box select `Rain Tracking`, click check mark for the node, click check mark for the rule chain
- Click on `POD Root`, select `Make rule chain root`
- Delete `Root Rule Chain` rule chain

### Adding Devices
- Got to `Devices` tab , select the `+` sign, select `Add new device`
- Copy the device name from ChirpStack, assign the corresponding device profile to make the label a name that is useful to your needs, set the device profile to the corresponding device, select `Next: Credentials` then `Next: Customer`, in `Customer to assign the device` select `POD`, click add
- Select the device you have created, click on `Copy access token`. This will have the access token which you will need in step 5
- In ChirpStack, select the device corresponding to the one that you have created, go to configuration, underneath that select variables, select `Add Variable`, for Name use `ThingsBoardAccessToken`, for value paste the access token that you`ve copied from step 3, click `Update Device`
- Repeat these steps for all devices
- At the end, make sure that all of the devices are assign to the customer named `POD`. If not, click on the 3 dots on the right of each device, click `Manage assigned customer`, and assign the customer to `POD`

### Adding Dashboards
- Download dashboards
- Select `Dashboards` tab, select the `+` sign, `Import dashboard`
- Import files
- For each dashboard, click on the 3 dots on the right of each device, click `Manage assigned customer`, and assign the customer to `POD`

### Optional: make dashboards convenient for customers
- Go to `Customers` tab
- Click on `POD`, click on `Manage users`
- Click on user, click on pencil to edit
- Set default dashboard to your choice (we used `Asset Tracking`)
- Select `Always fullscreen`
- Select `Hide home dashboard toolbar`
- Save changes

## Grafana (optional)

Only complete this section if `monitor` was set to true.

Grafana plots system metrics collected by Prometheus.
We collect data from Prometheus itself, Thingsboard, Chirpstack, and node exporter.
Node exporter collects computer level data, like CPU temperature, load, disk and network usage, etc.

### Login and change password

Start by going to `10.60.0.1:3000` if connected to the POD network or the Grafana tunnel if using Cloudflare tunnels. For example, pod-acre-welch-grafana.oatscenter.org.

The default username is `admin` and password `admin`.
At first login, it should ask you to change the default password.

### Add data source

To add the local Prometheus data source, hover over the gear in the left panel menu and select `Data sources`.
Click `Add data source`.
Choose `Prometheus` from the list.
Use `http://prometheus:9090` as the URL and leave the reset as the default values.
Click `Save & teste`

### Add Prometheus dashboard

Hover over the four square icon on the left panel menu, and select `Browse`.
Select `Import` button.
Use `3662` as the ID and select `Load`.
Set the name as you see fit and adjust the folder structure if you desire.
Choose `Prometheus` as the
Click `Import`.

### Add Node exporter dashboard

Hover over the four square icon on the left panel menu, and select `Browse`.
Select `Import` button.
Use `1860` as the ID and select `Load`.
Set the name as you see fit and adjust the folder structure if you desire.
Choose `Prometheus` as the Prometheus data source.
Click `Import`.

### Add Chirpstack dashboard

Hover over the four square icon on the left panel menu, and select `Browse`.
Select `Import` button.
Select [this JSON](https://raw.githubusercontent.com/thingsboard/thingsboard/master/docker/monitoring/grafana/provisioning/dashboards/core_and_js_metrics.json) and paste it into the `Import via panel json` box and select `Load`.
Set the name as you see fit and adjust the folder structure if you desire.
Click `Import`.

Hover over the four square icon on the left panel menu, and select `Browse`.
Select `Import` button.
Select [this JSON](https://raw.githubusercontent.com/thingsboard/thingsboard/master/docker/monitoring/grafana/provisioning/dashboards/rule_engine_metrics.json) and paste it into the `Import via panel json` box and select `Load`.
Set the name as you see fit and adjust the folder structure if you desire.
Click `Import`.
