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
        HID_data = [];

    var ui = {
        log: null,
        updateInterval: null
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

    function HID_poller(connection) {
        connection.subscribe(device => {
            function poll() {
                device.receive()
                    .do(data => console.log(data))
                    .subscribe(data => {
                        switch (data.type) {
                            case "ADC_spike_event":
                                logger("Location: " + data.location + " Value: " + data.value);
                                break;
                            case "raw_ADC":
                                HID_data = data.value;
                                break;
                            case "wire_touch_event":
                                logger("Duration: " + data.value);
                                break;
                            default:
                                logger(data.hex);
                        }
                    });
                [
                    {respiratory_rate: 42.42},
                    {tidal_volume: 42.42},
                    {lung_volume_total: 42.42},
                    {lung_volume_left: 42.42},
                    {lung_volume_right: 42.42},
                    {heart_rate: 42.42},
                    {ART: 42.42}
                ].forEach((obj, index, arr) => {
                    var dev = device.send(obj);
                    if (chrome.runtime.lastError) {
                        logger(chrome.runtime.lastError);
                    }
                    dev.subscribe(() => {},
                    error => {
                        logger(error);
                    });
                });
                setTimeout(() => poll(), 0);
            };

            console.log("Device:");
            console.log(device);
            device.initialize()
                .subscribe(time => {
                    console.log("Time:" + time);
                    setTimeout(() => poll(), 0);
                });
        });
    }

    /*
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
    */

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

    var filter = {};
    HID_poller(Device(filter));

    //updater(updateSensorData);
    //updater(updateRandomData);

});
