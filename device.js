/**
 * Created by riggs on 10/21/15.
 */
"use strict";

/* INCORRECT
 * Feature report 4: read/write 1 Uint64 timestamp
 * Input report 5: read 12 byte: Uint64 timestamp, Uint32 duration
 * Feature report 6: read/write 4 Float32 thresholds (of variance)
 * Input report 7: same as 5
 */

var HID = require("rxchromehid");

function hex_parser(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(function (i) {
            return Number.prototype.toString.call(i, 16).toUpperCase();
        })
        .join(" ");
}

module.exports = function(filter) {

    var shift = Math.pow(2, 32);    // Javascript doesn't support Uint64, so manually convert timestamp.

    var connection_ID = null;

    var reports = {
        thresholds: {
            report_ID: 6,
            type: "feature",
            decode: buffer => (new Float32Array(buffer)),
            encode: inputs => {
                var buffer = new ArrayBuffer(16),
                    values = new Float32Array(buffer);
                values.set(inputs);
                return buffer;
            }
        },
        timestamp: {
            report_ID: 4,
            type: "feature",
            encode: timestamp => {
                var buffer = new ArrayBuffer(8),
                    dataview = new DataView(buffer);
                dataview.setUint32(0, (timestamp / shift) | 0);
                dataview.setUint32(4, timestamp % shift);
                return buffer;
            },
            decode: buffer => {
                var dataview = new DataView(buffer);
                return dataview.getUint32(0) * shift + dataview.getUint32(4);
            }
        },
        event: {
            report_ID: 7,
            type: "input",
            decode: buffer => {
                var timestamp = reports.timestamp.decode(buffer),
                    result = (new DataView(buffer)).getUint32(8),
                    location = (new DataView(buffer)).getUint8(12),
                    hex = hex_parser(buffer);

                return {
                    value: result,
                    timestamp: timestamp,
                    type: "event",
                    location: location,
                    tags: [],
                    hex: hex,
                    source: null
                };
            }
        },
        raw_ADC: {
            report_ID: 3,
            type: "input",
            decode: buffer => {
                var ADC_values = new Uint16Array(buffer, 0, 4),     // 1st 8 bytes are 4 16-bit Ints
                    variance = new Float32Array(buffer, 8);         // Next 16 bytes are 4 32-bit Floats
                return {
                    type: "raw_ADC",
                    timestamp: Date.now(),
                    value: Array.from(ADC_values).concat(Array.from(variance))
                };
            }
        }
    };

    var timestamp = {
        get: () => HID.receiveFeatureReport(connection_ID, reports.timestamp.report_ID)
            .map(buffer => buffer.slice(1))
            .map(reports.timestamp.decode),
        set: time => HID.sendFeatureReport(
                connection_ID,
                reports.timestamp.report_ID,
                reports.timestamp.encode(time)
            )
            .flatMap(() => timestamp.get())
    };

    function get_thresholds() {
        HID.receiveFeatureReport(connection_ID, reports.thresholds.report_ID)
            // Drop the report ID from the returned data.
            .map(buffer => buffer.slice(1))
            .map(reports.thresholds.decode)
            .subscribe(console.log);
    }

    function set_thresholds(...values) {
        var buffer = reports.thresholds.encode(values);
        HID.sendFeatureReport(connection_ID, reports.thresholds.report_ID, buffer)
            .subscribe(() => console.log("Set thresholds to: " + values));
    }

    function initialize() {
        return timestamp.set(Date.now());
    }

    function receive() {
        return HID.receive(connection_ID)
            .map(result => {
                var report_ID = result.reportId,
                    buffer    = result.buffer;
                switch (report_ID) {
                    case reports.event.report_ID:
                        return reports.event.decode(buffer);
                    case reports.raw_ADC.report_ID:
                        return reports.raw_ADC.decode(buffer);
                    default:
                        console.log(hex_parser(buffer));
                }
            });
    }

    var HID_connection = HID.getDevices(filter)
        .flatMap(devices => devices)
        // TODO: UI selector when multiple devices detected
        .first();

    return HID_connection.pluck('deviceId')
        .flatMap(device_ID => HID.connect(device_ID))
        .pluck('connectionId')
        .map(id => {
            console.log("Connected to " + id);
            connection_ID = id;
            return {
                connection_ID: id,
                reports: reports,
                timestamp: timestamp,
                get_thresholds: get_thresholds,
                set_thresholds: set_thresholds,
                receive: receive,
                initialize: initialize,
            }
        });
};

