#!/usr/bin/env bash

## This is a somewhat naive script to produce a POD customized FCOS installer

## Usage: ./build-installer.sh <config-file> <install-disk-device-file-path>

# set -x

# The POD configration file
config=$1
# The disk device file to install the POD software on
disk=$2

config_basename=$(basename "$config")
podname=${config_basename%%.*}

# Make a build scratch directory
mkdir -p ./build

echo "Generating Butane file from $config"
podman run --rm -it -v ".:/pwd":z -w /pwd dcagatay/j2cli \
	./pod.bu.j2 "$config" >"build/${podname}.bu"

if [ $? -ne 0 ]; then
	echo "Failed to generate Butane file"
	exit 1
fi

echo "Generating ignition file"
podman run -i --rm --volume .:/pwd:z -w /pwd \
	quay.io/coreos/butane:release --strict "build/${podname}.bu" >"build/${podname}.ign"

if [ $? -ne 0 ]; then
	echo "Failed to generate ignition file"
	exit 1
fi

echo "Downloading Fedora CoreOS stable installer for bare metal"
iso=$(podman run --pull=always --rm -v ./build:/pwd:z -w /pwd \
	quay.io/coreos/coreos-installer:release download -s stable -p metal -f iso | tail -1)

if [ $? -ne 0 ]; then
	echo "Failed to download Fedora CoreOS installer"
	exit 1
fi

echo "ISO: $iso"

echo "Customizing installer for ${podname}"
podman run --pull=always --rm -v .:/pwd:z -w /pwd \
	quay.io/coreos/coreos-installer:release iso customize \
	--dest-device "$disk" \
	--dest-ignition "build/${podname}.ign" \
	-o "${podname}.iso" "build/$iso"

if [ $? -ne 0 ]; then
	echo "Failed to customize installer for ${podname}"
	exit 1
fi
