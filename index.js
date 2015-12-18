"use strict";

var Rx = require("rx");
var HID = require("HID");

Rx.DOM.ready().subscribe(function () {

    // We use an inline data source in the example, usually data would
    // be fetched from a server

    var data = [],
        totalPoints = 300,
        updateInterval = 30,
        HID_data = [],
        last_sample = Date.now();

    function updateRandomData(update_plot) {

        if (data.length > 0)
            data = data.slice(1);

        // Do a random walk

        while (data.length < totalPoints) {

            var prev = data.length > 0 ? data[data.length - 1] : 50,
                y = prev + Math.random() * 10 - 5;

            if (y < 0) {
                y = 0;
            } else if (y > 100) {
                y = 100;
            }

            data.push(y);
        }

        // Zip the generated y values with the x values

        var res = [];
        for (var i = 0; i < data.length; ++i) {
            res.push([i, data[i]])
        }
        var results = Array({label: "Random", data: res});
        update_plot(results);
    }

    function _initialize_USB_connection(poller) {
        chrome.hid.getDevices({}, function (devinfos) {
            console.log(devinfos);
            chrome.hid.connect(devinfos[0].deviceId, function (conn) {
                console.log(conn);
                poller(conn.connectionId);
            })
        });
    }

    function initialize_USB_connection(poller) {
        HID.getDevices({}).then(function (device_info) {
            console.log(device_info);
            return HID.connect(device_info[0].deviceId);
        }).then(function (connection) {
            poller(connection.connectionId);
        })
    }

    var USB_connection = Rx.Observable.fromPromise(HID.getDevices({}))
        .flatMap(function (devices) {
            return devices;
        }).map(function (device) {
            return device.deviceId;
        }).flatMap(function (device_id) {
            return Rx.Observable.fromPromise(HID.connect(device_id));
        }).map(function (connection) {
            return connection.connectionId;
        });


    function updateSensorData(update_plot) {

        var sensor_values = HID_data;
        //sensor_values = [sensor_values[1], sensor_values[6], sensor_values[4], sensor_values[7]];
        /*
        for (var i = 4; i < sensor_values.length; ++i) {
            sensor_values[i] = Math.sqrt(sensor_values[i]);
        }
        */

        /*
        var now = Date.now();
        sensor_values.push((now - last_sample) * 10);
        last_sample = now;
        */

        if (data.length > 300) {
            data = data.slice(1);
        }

        data.push(sensor_values);

        var results = [];
        for (var i = 0; i < sensor_values.length; ++i) {
            (function () {
                var values = [];
                for (var j = 0; j < data.length; ++j) {
                    values.push([j, data[j][i]])
                }
                results.push({data: values});
            })()
        }
        update_plot(results);
    }

    function hex_parser(buffer) {
        return Array.from(new Uint16Array(buffer))
            .map(function (i) {
                return Number.prototype.toString.call(i, 16).toUpperCase();
            })
            .toString();
    }

    function HID_poller(USB_connection) {
        chrome.hid.receive(USB_connection, function (rid, buffer) {
            /*
            var ADC_values = new DataView(buffer, 0, 8),     // 1st 8 bytes are 4 16-bit Ints
                variance = new DataView(buffer, 8);         // Next 16 bytes are 4 32-bit Floats
            var sensor_values = [];
            for (var i = 0; i < 4; ++i) {
                sensor_values.push(ADC_values.getUint16(i * 2, true));
                sensor_values.push(variance.getFloat32(i * 4, true));
            }
            */
            var ADC_values = new Uint16Array(buffer, 0, 4),     // 1st 8 bytes are 4 16-bit Ints
                variance = new Float32Array(buffer, 8);         // Next 16 bytes are 4 32-bit Floats
            HID_data = Array.from(ADC_values).concat(Array.from(variance));
            //console.log(HID_data);
            //console.log(hex_parser(buffer));

            /*
            var sensor_values = [];
            var words = new Uint16Array(buffer);
            var bytes = new Uint8Array(buffer);
            for (var i = 0; i < words.length; ++i) {
                sensor_values.push(bytes[2 * i] * 256 + bytes[2 * i + 1]);
            HID_data = sensor_values;
            }
            */

            setTimeout(function () {HID_poller(USB_connection)}, 0);
        });
    }


    // Set up the control widget

    $("#updateInterval").val(updateInterval).change(function () {
        var v = $(this).val();
        if (v && !isNaN(+v)) {
            updateInterval = +v;
            if (updateInterval < 1) {
                updateInterval = 1;
            } else if (updateInterval > 20000) {
                updateInterval = 20000;
            }
            $(this).val("" + updateInterval);
        }
    });

    var plot = $.plot("#placeholder", [], {
        series: {
            shadowSize: 0	// Drawing is faster without shadows
        },
        yaxis: {
            show: true,
            min: 0,
            max: 1023
        },
        xaxis: {
            show: false,
            min: 0,
            max: 300
        }
    });

    function update_plot(data) {
        plot.setData(data);
        // Since the axes don't change, we don't need to call plot.setupGrid()
        plot.draw();
    }

    function updater(data_function) {
        data_function(update_plot);
        setTimeout(function () {updater(data_function);}, updateInterval);
    }

    //initialize_USB_connection(HID_poller);
    USB_connection.subscribe(function (connection_id) {
        HID_poller(connection_id);
    });

    updater(updateSensorData);
    //updater(updateRandomData);

    // Add the Flot version string to the footer

    $("#footer").prepend("Flot " + $.plot.version + " &ndash; ");
});
