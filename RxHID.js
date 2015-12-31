/**
 * Created by riggs on 10/2/15.
 */
"use strict";

var Rx = require("rx");

var HID = {};

HID.getDevices = Rx.Observable.fromCallback(chrome.hid.getDevices);

HID.connect = Rx.Observable.fromCallback(chrome.hid.connect);

HID.disconnect = Rx.Observable.fromCallback(chrome.hid.disconnect);

HID.receive = Rx.Observable.fromCallback(
    chrome.hid.receive,
    chrome.hid,
    (reportId, buffer) => ({reportId: reportId, buffer: buffer})
);

HID.send = Rx.Observable.fromCallback(chrome.hid.send);

HID.receiveFeatureReport = Rx.Observable.fromCallback(chrome.hid.receiveFeatureReport);

HID.sendFeatureReport = Rx.Observable.fromCallback(chrome.hid.sendFeatureReport);

module.exports = HID;
