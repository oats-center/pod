function Decode(port, bytes, variables) {
  var output = {
    port: port,
    data: bytes,
    warnings: [],
  };
  // decode: decode(sensor, bytes, port, true)
  switch (port) {
    // fPort 10
    case 10:
      // Loop over all variables in the message, decoding one at a time.
      var offset = 0;
      while (offset < bytes.length) {
        // Get key / header for this data point
        var key = getUint16(bytes, offset);
        offset += 2;

        // Process the data based on the data type key
        switch (key) {
          // Battery
          case 0x00ba:
            var value = getUint8(bytes, offset);
            offset += 1;

            output.battery_voltage = (value & 0x7f) * 0.01 + 2.5;
            output.end_of_service = (value & 0x80) !== 0;
            break;

          // Soil GWC (surface)
          case 0x0104:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_moisture_hz = value * 1000;
            output.soil_moisture_gwc = convertSoilGWC(output.soil_moisture_hz);
            break;

          // Soil temperature (surface)
          case 0x0202:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_temp0_raw = value;

            value = -32.46 * Math.log(value) + 236.36;
            output.soil_temp0_c = +value.toFixed(2);
            break;

          // Soil temperature (elevated)
          case 0x0302:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_temp1_raw = value;

            value = -31.96 * Math.log(value) + 213.25;
            output.soil_temp1_c = +value.toFixed(2);
            break;

          // Soil temperature (elevated)
          case 0x0402:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_temp2_raw = value;

            value = -31.96 * Math.log(value) + 213.25;
            output.soil_temp2_c = +value.toFixed(2);
            break;

          // Watermark 1 (elevated)
          case 0x0504:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_watermark1_hz = value;

            value = convertWatermark(value);
            output.water_tension1_kpa = +value.toFixed(2);
            break;

          // Watermark 2 (elevated)
          case 0x0604:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.soil_watermark2_hz = value;

            value = convertWatermark(value);
            output.water_tension2_kpa = +value.toFixed(2);
            break;

          // Light Intensity
          case 0x0965:
            var value = getUint16(bytes, offset);
            offset += 2;

            output.light_intensity_lux = value;
            break;

          // Ambient Temp
          case 0x0b67:
            var value = getInt16(bytes, offset);
            offset += 2;

            output.ambient_temp_raw = value;
            output.ambient_temp_c = +(value / 10.0).toFixed(2);
            break;

          // Relative Humidity
          case 0x0b68:
            var value = getUint8(bytes, offset);
            offset += 1;

            output.relative_humidity_raw = value;
            output.relative_humidity = +(value / 2.0).toFixed(2);
            break;

          // MCU Temperature
          case 0x0c67:
            var value = getInt16(bytes, offset);
            offset += 2;

            output.mcu_temp_raw = value;
            output.mcu_temp_c = +(value / 10.0).toFixed(2);
            break;

          default:
            output.warnings.push("Unknown data key: " + key.toString(16));
        }
      }

      break;

    // fPort 100
    case 100:
      // FIXME: Should deal with config uplinks someday ...
      output.warnings.push("Config uplinks not implemented");
      break;

    default:
      output.warnings.push("Unknown port: " + port);
  }

  // Apply temp calibration if possible
  if (output.water_tension1_kpa && output.soil_temp1_c) {
    output.water_tension1_kpa_cal =
      output.water_tension1_kpa * (1 - 0.019 * (output.soil_temp1_c - 24));
  }

  // Apply temp calibration if possible
  if (output.water_tension2_kpa && output.soil_temp2_c) {
    output.water_tension2_kpa_cal =
      output.water_tension2_kpa * (1 - 0.019 * (output.soil_temp2_c - 24));
  }

  return output;
}

//////////////////////////
// CONVERSION FUNCTIONS //
//////////////////////////
function convertSoilGWC(value) {
  value = value / 1000; /// threshold on kHz

  if (value < 1346) return 1.2;
  if (value < 1351 && value >= 1346) return 1.1;
  if (value < 1356 && value >= 1351) return 1.0;
  if (value < 1361 && value >= 1356) return 0.9;
  if (value < 1366 && value >= 1361) return 0.8;
  if (value < 1371 && value >= 1366) return 0.7;
  if (value < 1376 && value >= 1371) return 0.6;
  if (value < 1381 && value >= 1376) return 0.5;
  if (value < 1386 && value >= 1381) return 0.4;
  if (value < 1391 && value >= 1386) return 0.3;
  if (value < 1396 && value >= 1391) return 0.2;
  if (value < 1399 && value >= 1396) return 0.1;
  if (value < 1402 && value >= 1399) return 0;

  return -1;
}

function convertWatermark(hz) {
  var kPa;

  if (hz < 293) {
    kPa = 200;
  } else if (hz <= 485) {
    kPa = 200 - (hz - 293) * 0.5208;
  } else if (hz <= 600) {
    kPa = 100 - (hz - 485) * 0.2174;
  } else if (hz <= 770) {
    kPa = 75 - (hz - 600) * 0.1176;
  } else if (hz <= 1110) {
    kPa = 55 - (hz - 770) * 0.05884;
  } else if (hz <= 2820) {
    kPa = 35 - (hz - 1110) * 0.0117;
  } else if (hz <= 4330) {
    kPa = 15 - (hz - 2820) * 0.003974;
  } else if (hz <= 6430) {
    kPa = 9 - (hz - 4330) * 0.004286;
  } else if (hz > 6430) {
    kPa = 0;
  }

  return kPa;
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////
function getUint8(bytes, offset) {
  return bytes[offset];
}

function getUint16(bytes, offset) {
  return bytes[offset] * 256 + bytes[offset + 1];
}

function getInt16(bytes, offset) {
  // Properly sign extend if needed
  return ((bytes[offset] << 24) >> 16) | bytes[offset + 1];
}
