"use strict";

var Rx = require("rx");
require("rx-dom");
var Device = require("./device.js");

Rx.DOM.ready().subscribe(() => {

    // We use an inline data source in the example, usually data would
    // be fetched from a server

    var data = [],
        totalPoints = 300,
        updateInterval = 30,
        HID_data = [],
        update_frequency = 90,
        last_sample = Date.now();

    var ui = {
        log: null,
        updateInterval: null,
        //update_frequency: null,
    };

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
        var results = new Array({label: "Random", data: res});
        update_plot(results);
    }

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
        return Array.from(new Uint8Array(buffer))
            .map(function(i) {
                return Number.prototype.toString.call(i, 16).toUpperCase();
            })
            .join(" ");
    }

    function USB_poller(USB_connection) {
        chrome.hid.receive(USB_connection, function(rid, buffer) {
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

            setTimeout(function() {USB_poller(USB_connection)}, 0);
        });
    }

    function HID_poller(connection) {
        connection.subscribe(device => {
            function poll() {
                device.receive()
                    .subscribe(data => {
                        switch (data.type) {
                            case "event":
                                logger(data.hex);
                                break;
                            case "raw_ADC":
                                HID_data = data.value;
                                break;
                        }
                    });
                setTimeout(() => poll(), 0);
            }

            console.log("Device:");
            console.log(device);
            device.initialize()
                .subscribe(time => {
                    console.log("Time:" + time);
                    setTimeout(() => poll(), 0);
                });
        });
    }


    // Set up the control widget

    /*
    $("#updateInterval").val(updateInterval).change(function() {
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
    */

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
        setTimeout(function() {updater(data_function);}, updateInterval);
    }

    function logger (message) {
        ui.log.textContent += (message + "\n");
        ui.log.scrollTop = ui.log.scrollHeight;
    }

    for (var k in ui) {
        var element = document.getElementById(k);
        if (!element) {
            throw "Missing UI element: " + k;
        }
        ui[k] = element;
    }

    Rx.DOM.change(ui.updateInterval)
        .pluck('target', 'value')
        .map(number => {
            if (number < 1) {
                return 1;
            } else if (number > 20000) {
                return 20000;
            } else {
                return Math.floor(number);
            }
        })
        .do(number => console.log(number))
        //.debounce(200)
        //.distinctUntilChanged()
        .subscribe(value => {
            updateInterval = value;
        });

    /*
    Rx.DOM.change(ui.update_frequency)
    .pluck('target', 'value')
    .subscribe(value => {update_frequency = value;});
    */


    var filter = {};
    HID_poller(Device(filter));

    updater(updateSensorData);
    //updater(updateRandomData);

});
