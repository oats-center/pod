#!/usr/bin/env bash

## This is a somewhat naive script to produce a POD customized FCOS installer

## Usage: ./build-installer.sh <config-file> <install-disk-device-file-path>

# set -x

# The POD configration file
config=$1
# The disk device file to install the POD software on
disk=$2

GREEN=$(tput setaf 2)
PURPLE=$(tput setaf 5)
BOLD=$(tput bold)
NC=$(tput sgr0)

config_basename=$(basename "$config")
podname=${config_basename%%.*}

# Make a build scratch directory
mkdir -p ./build

echo -e "${GREEN}${BOLD}[1/4] Generating Butane file from $config${NC}"
podman run --rm -it -v ".:/pwd":z -w /pwd dcagatay/j2cli \
	./pod.bu.j2 "$config" >"build/${podname}.bu"

if [ $? -ne 0 ]; then
	echo "Failed to generate Butane file"
	exit 1
fi

echo -e "\n${GREEN}${BOLD}[2/4] Generating ignition file${NC}"
podman run -i --rm --volume .:/pwd:z -w /pwd \
	quay.io/coreos/butane:release --strict "build/${podname}.bu" >"build/${podname}.ign"

if [ $? -ne 0 ]; then
	echo "Failed to generate ignition file"
	exit 1
fi

echo -e "\n${GREEN}${BOLD}[3/4] Downloading Fedora CoreOS stable installer for bare metal${NC}"
iso=$(podman run --pull=always --rm -v ./build:/pwd:z -w /pwd \
	quay.io/coreos/coreos-installer:release download -s stable -p metal -f iso | tail -1)

if [ $? -ne 0 ]; then
	echo "Failed to download Fedora CoreOS installer"
	exit 1
fi

rm -f "build/${podname}.iso"

echo -e "\n${GREEN}${BOLD}[4/4] Customizing installer for ${podname}${NC}"
podman run --pull=always --rm -v ./build:/pwd:z -w /pwd \
	quay.io/coreos/coreos-installer:release iso customize \
	--dest-device "$disk" \
	--dest-ignition "${podname}.ign" \
	-o "${podname}.iso" "$iso"

if [ $? -ne 0 ]; then
	echo "Failed to customize installer for ${podname}"
	exit 1
fi

echo -e "\n${PURPLE}${BOLD}🎉 Created Installer: build/${podname}.iso${NC}"
