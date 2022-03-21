function Decode(port, bytes, variables) {
  var output = {
    port: port,
    data: bytes,
    warnings: []
  }; 

  switch(port) {
    // GPS
    case 1:
      output.lat_deg = getInt32(bytes, 0) / 1e7;
      output.lon_deg = getInt32(bytes, 4) / 1e7;

      var b = getUint8(bytes, 8);
      output.in_trip    = ((b & 0x1) !== 0);
      output.fix_failed = ((b & 0x2) !== 0);
      output.heading_deg = (b >> 2) * 5.625;

      output.speed_kmph = getUint8(bytes, 9);

      output.battery_voltage = +((getUint8(bytes, 10) * 0.025).toFixed(2));

      if(output.fix_failed) {
        output.warnings.push("Fix failed");
      }
      break;

    // Downlink ACK
    case 2:
      var b = getUint8(bytes, 0);
      output.ack_sequence = (b & 0x7F);
      output.ack_accepted = ((b & 0x80) !== 0);
      output.firmware_version = getUint8(bytes, 1) + getUint8(bytes, 2)/10;

      break;

    // Stats
    case 3:
      output.initial_battery_voltage = (getUint8(bytes, 0) & 0x0F) * 0.1 + 4;
      output.tx_count = ((getUint16(bytes, 0) & 0x7FF0) >> 4) * 32;
      output.trip_count = ((getUint32(bytes, 1) & 0xFFF80) >> 7) * 32;
      output.gps_successes = ((getUint16(bytes, 3) & 0x3FF0) >> 4) * 32;
      output.gps_failures = ((getUint16(bytes, 4) & 0x3FC0) >> 6) * 32;
      output.avg_fix_sec = (getUint16(bytes, 5) & 0x7FC0) >> 6;
      output.avg_fail_sec = (getUint16(bytes, 6) & 0xFF80) >> 7;
      output.avg_freshen_time_sec = getUint8(bytes, 8);    
      output.avg_wakeups_per_trip = getUint8(bytes, 9) & 0x7F;
      output.uptime_weeks = (getUint16(bytes, 9) & 0xFF80) >> 7;
      break;

    // Extended GPS
    case 4:
      output.lat_deg = getInt24(bytes, 0) * 256e-7;
      output.lon_deg = getInt24(bytes, 3) * 256e-7;

      var b = getUint8(bytes, 6);
      output.heading_deg = (b & 0x7) * 45;
      output.speed_kmph = (b >> 3) * 5;

      output.battery_voltage = +((getUint8(bytes, 7) * 0.025).toFixed(2));

      var b = getUint8(bytes, 8);
      output.in_trip    = ((b & 0x1) !== 0);
      output.fix_failed = ((b & 0x2) !== 0);
      output.man_down   = ((b & 0x4) !== 0);


      if(output.fix_failed) {
        output.warnings.push("Fix failed");
      }

      break;


    default:
      output.warnings.push('unknown port: ' + port);
      break;
  }

  return output;
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////
function getUint8(bytes, offset) {
  return bytes[offset];
}

function getUint16(bytes, offset) {
  return bytes[offset+1] * 256 + bytes[offset];
}

function getUint24(bytes, offset) {
  return bytes[offset+2] * 65536 + bytes[offset+1] * 256 + bytes[offset];
}

function getInt24(bytes, offset) {
  var v = bytes[offset+2] * 65536 + bytes[offset+1] * 256 + bytes[offset];

  // Two's compliment
  if (v >= 0x800000) { 
    v -= 0x1000000; 
  }

  return v;
}

function getUint32(bytes, offset) {
  return bytes[offset+3] * 16777216 + bytes[offset+2] * 65536 + bytes[offset+1] * 256 + bytes[offset];
}

function getInt32(bytes, offset) {
  var v = bytes[offset+3] * 16777216 + bytes[offset+2] * 65536 + bytes[offset+1] * 256 + bytes[offset];

  // Two's compliment
  if (v >= 0x80000000) { 
    v -= 0x100000000; 
  }

  return v;
}
