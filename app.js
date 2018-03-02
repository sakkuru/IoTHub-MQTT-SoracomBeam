const imu = require('node-sense-hat').Imu;
const matrix = require('node-sense-hat').Leds;
const sense = require("sense-hat-led");

const mqtt = require('mqtt');
const iotHubEndpoint = process.env.iotHubEndpoint || 'sakkuru-iot-hub.azure-devices.net';
const deviceId = process.env.deviceId || 'raspi01';
const mqttServer = process.env.mqttServer || 'mqtt://beam.soracom.io';

const pubMessageTopic = `devices/${deviceId}/messages/events/`;
const subMessageTopic = `devices/${deviceId}/messages/devicebound/#`;

const subTwinDesiredTopic = `$iothub/twin/PATCH/properties/desired/#`;
const pubTwinReportedTopic = `$iothub/twin/PATCH/properties/reported/?$rid=`;
const subTwinResponseTopic = `$iothub/twin/res/#`;

const subMethodTopic = '$iothub/methods/POST/#';
const pubMethodResponseTopic = `$iothub/methods/res/{status}/?$rid=`;

const client = mqtt.connect(mqttServer, {
    clientId: deviceId
});

const IMU = new imu.IMU();
let delay = 1000;

const getSensorData = () => {
    return new Promise((resolve, reject) => {

        IMU.getValue((err, data) => {
            if (err != null) {
                console.error('Could not read sensor data: ', err);
                return;
            }

            // console.log('Accelleration is: ', JSON.stringify(data.accel, null, '  '));
            // console.log('Gyroscope is: ', JSON.stringify(data.gyro, null, '  '));
            // console.log('Compass is: ', JSON.stringify(data.compass, null, '  '));
            // console.log('Fusion data is: ', JSON.stringify(data.fusionPose, null, '  '));

            // console.log('Temp is: ', data.temperature);
            // console.log('Pressure is: ', data.pressure);
            // console.log('Humidity is: ', data.humidity);

            sense.showMessage(data.temperature.toString().slice(0, 2), [255, 0, 0]);
            resolve(data);
        });

    });
};

client.on('connect', () => {
    client.subscribe(subMessageTopic);
    client.subscribe(subTwinResponseTopic);
    client.subscribe(subTwinDesiredTopic);
    client.subscribe(subMethodTopic);
});

client.on('message', (topic, message) => {
    console.log('message received!:', topic, message.toString());
    if (topic.includes("$iothub/methods/POST/")) {
        let methodName = topic.split("$iothub/methods/POST/")[1].split("/")[0];
        let rid = topic.split("=")[1];
        let args = JSON.parse(message.toString());
        if (methods[methodName]) {
            methods[methodName](rid, args);
        }
    }
});

const methods = {
    'hoge': (rid, args) => {
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, JSON.stringify("success!!"));
    }
};

const sendMessage = message => {
    // client.publish(pubMessageTopic, message);

    const reported = {
            sample: {
                location: {
                    region: 'JP'
                }
            }
        }
        // client.publish(pubTwinReportedTopic + '1', JSON.stringify(reported));
}

setInterval(() => {
    getSensorData().then(sensorData => {
        // console.log('sensorData', sensorData);
        sendMessage(JSON.stringify(sensorData));
    });
}, delay);

// sense.showMessage("One small step for Pi!", [255, 0, 0]);

const O = [0, 0, 0];
const X = [255, 0, 0];

const cross = [
    X, O, O, O, O, O, O, X,
    O, X, O, O, O, O, X, O,
    O, O, X, O, O, X, O, O,
    O, O, O, X, X, O, O, O,
    O, O, O, X, X, O, O, O,
    O, O, X, O, O, X, O, O,
    O, X, O, O, O, O, X, O,
    X, O, O, O, O, O, O, X,
];
matrix.setPixels(cross);