function Decode(port, bytes, variables) {
  var output = {
    port: port,
    data: bytes,
    warnings: [],
  };

  /////////////////
  // SENSOR NODE //
  /////////////////

  // Loop over all variables in the message, decoding one at a time.
  var offset = 0;
  while (offset < bytes.length) {
    var key;

    // Get key / header for this data point
    if (offset === 0) {
      key = port;
    } else {
      key = getUint8(bytes, offset);
      offset += 1;
    }

    // Process the data based on the data type key
    switch (key) {
      // Verison
      case 1:
        output.product_id = getUint8(bytes, offset);
        offset += 1;

        output.hardware_rev = getUint8(bytes, offset);
        offset += 1;

        output.firmware_major = getUint8(bytes, offset);
        offset += 1;

        output.firmware_minor = getUint8(bytes, offset);
        offset += 1;
        break;

      // GPS
      case 10:
        output.lat = getInt24(bytes, offset) * 0.0000256;
        offset += 3;

        output.lng = getInt24(bytes, offset) * 0.0000256;
        offset += 3;
        break;

      // Battery voltage
      case 20:
        output.battery_voltage = getUint16(bytes, offset) / 1000;
        offset += 2;
        break;

      // Analog in 1
      case 21:
        output.analog_in_1 = getUint16(bytes, offset) / 1000;
        offset += 2;
        break;

      // Analog in 2
      case 22:
        output.analog_in_2 = getUint16(bytes, offset) / 1000;
        offset += 2;
        break;

      // Input 1 pulse count
      case 31:
        output.input1_pulse_count = getUint16(bytes, offset);
        offset += 2;
        break;

      // Input 2 pulse count
      case 32:
        output.input2_pulse_count = getUint16(bytes, offset);
        offset += 2;
        break;

      case 39:
        output.current_io_state = getUint8(bytes, offset);
        offset += 1;

        output.alert_input = getUint8(bytes, offset);
        offset += 1;

        output.input1_pulse_count = getUint16(bytes, offset);
        offset += 2;

        output.input2_pulse_count = getUint16(bytes, offset);
        offset += 2;
        break;

      // Internal temperature
      case 40:
        output.internal_temp = getUint16(bytes, offset) / 100;
        offset += 2;
        break;

      default:
        output.warnings.push("unknown port or register address: " + key);
        break;
    }
  }

  ////////////////////////
  // SENSOR CONVERSIONS //
  ////////////////////////

  // VH400
  if (output.analog_in_1) {
    var vwc = +vegetronixVWC(output.analog_in_1).toFixed(2);

    if (vwc < 0) {
      output.warnings.push(
        "Invalid VH400 sensor range (" +
          output.analog_in_1 +
          ") on input 1. Is it connected?"
      );
    } else {
      output.volumetric_water_content_1 = vwc;
    }
  }

  // VH400
  if (output.analog_in_2) {
    var vwc = +vegetronixVWC(output.analog_in_2).toFixed(2);

    if (vwc < 0) {
      output.warnings.push(
        "Invalid VH400 sensor range (" +
          output.analog_in_2 +
          ") on input 2. Is it connected?"
      );
    } else {
      output.volumetric_water_content_2 = vwc;
    }
  }

  // Davis AeroCone Rain Gauge (6466)
  if (output.input1_pulse_count) {
    output.total_rain_in = +(output.input1_pulse_count * 0.01).toFixed(2);
  }

  return output;
}

//////////////////////////
// CONVERSION FUNCTIONS //
//////////////////////////
//
// Source: https://www.vegetronix.com/Products/VH400/VH400-Piecewise-Curve
function vegetronixVWC(value) {
  if (value < 0) return -1;
  if (value <= 1.1) return 10 * value - 1;
  if (value <= 1.3) return 25 * value - 17.5;
  if (value <= 1.82) return 48.08 * value - 47.5;
  if (value <= 2.2) return 26.32 * value - 7.89;
  if (value <= 3.0) return 62.5 * value - 87.5;

  return -1;
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////
function getUint8(bytes, offset) {
  return bytes[offset];
}

function getUint16(bytes, offset) {
  return bytes[offset + 1] * 256 + bytes[offset];
}

function getUint24(bytes, offset) {
  return bytes[offset] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2];
}

function getInt24(bytes, offset) {
  var v = bytes[offset] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2];

  if ( (v & 0x800000) > 0 ) {
    v -= 0x1000000;
  }
  
  return v;
}

function getUint32(bytes, offset) {
  return (
    bytes[offset + 3] * 16777216 +
    bytes[offset + 2] * 65536 +
    bytes[offset + 1] * 256 +
    bytes[offset + 3]
  );
}
