/**
 * Created by riggs on 10/21/15.
 */
"use strict";

var HID = require(".RxHID.js");

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
        3: "raw_ADC",
        raw_ADC: {
            report_ID: 3,
            input: {
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
        },
        4: "timestamp",
        timestamp: {
            report_ID: 4,
            feature: {
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
            }
        },
        5: "wire_touch_event",
        wire_touch_event: {
            report_ID: 5,
            input: {
                decode: buffer => {
                    var timestamp = reports.timestamp.feature.decode(buffer),
                        duration = (new DataView(buffer)).getUint32(8);
                    return {
                        value: duration,
                        timestamp: timestamp,
                        type: "wire_touch_event",
                        location: null,
                        tags: [],
                        hex: hex_parser(buffer),
                        source: null
                    };
                }
            }
        },
        6: "thresholds",
        thresholds: {
            report_ID: 6,
            feature: {
                decode: buffer => (new Float32Array(buffer)),
                encode: inputs => {
                    var buffer = new ArrayBuffer(16),
                        values = new Float32Array(buffer);
                    values.set(inputs);
                    return buffer;
                }
            }
        },
        7: "ADC_spike_event",
        ADC_spike_event: {
            report_ID: 7,
            input: {
                decode: buffer => {
                    var timestamp = reports.timestamp.feature.decode(buffer),
                        result = (new DataView(buffer)).getUint32(8),
                        location = (new DataView(buffer)).getUint8(12);

                    return {
                        value: result,
                        timestamp: timestamp,
                        type: "ADC_spike_event",
                        location: location,
                        tags: [],
                        hex: hex_parser(buffer),
                        source: null
                    };
                }
            }
        },
        8: "respiratory_rate",
        respiratory_rate: {
            report_ID: 8,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        9: "tidal_volume",
        tidal_volume: {
            report_ID: 9,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        10: "lung_volume_total",
        lung_volume_total: {
            report_ID: 10,
            type: "output",
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        11: "lung_volume_left",
        lung_volume_left: {
            report_ID: 11,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        12: "lung_volume_right",
        lung_volume_right: {
            report_ID: 12,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        13: "heart_rate",
        heart_rate: {
            report_ID: 13,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        14: "ART",
        ART: {
            report_ID: 14,
            output: {
                encode: value => {
                    var buffer = new ArrayBuffer(4),
                        input = new Float32Array(buffer);
                    input.set([value]);
                    return buffer;
                }
            },
            input: {
                decode: buffer => {
                    return {
                        type: "respiratory_rate",
                        value: (new Float32Array(buffer))[0],
                        timestamp: Date.now(),
                        hex: hex_parser(buffer)
                    }
                }
            }
        },
        15: "null",
        null: {
            report_ID: 15,
            input: {
                decode: buffer => {
                    return {
                        type: "null",
                        timestamp: Date.now(),
                        value: (new Uint8Array(buffer))[0],
                        hex: hex_parser(buffer)
                    }
                }
            }
        }
    };

    var timestamp = {
        get: () => HID.receiveFeatureReport(connection_ID, reports.timestamp.report_ID)
            .map(buffer => buffer.slice(1))
            .map(reports.timestamp.feature.decode),
        set: time => HID.sendFeatureReport(
                connection_ID,
                reports.timestamp.report_ID,
                reports.timestamp.feature.encode(time)
            )
            .flatMap(() => timestamp.get())
    };

    function get_thresholds() {
        HID.receiveFeatureReport(connection_ID, reports.thresholds.report_ID)
            // Drop the report ID from the returned data.
            .map(buffer => buffer.slice(1))
            .map(reports.thresholds.feature.decode)
            .subscribe(console.log);
    }

    function set_thresholds(...values) {
        var buffer = reports.thresholds.feature.encode(values);
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
                //console.log(report_ID);
                return reports[reports[report_ID]].input.decode(buffer);
            });
    }

    function send(obj) {
        // TODO: Combine more than one sent value into one observable.
        var key = Object.keys(obj)[0],
            report = reports[key];
        return HID.send(connection_ID, report.report_ID, report.output.encode(obj[key]));
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
                initialize: initialize,
                receive: receive,
                send: send
            }
        });
};

