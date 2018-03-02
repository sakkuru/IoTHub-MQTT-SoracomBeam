const imu = require('node-sense-hat').Imu;
const IMU = new imu.IMU();
const matrix = require('node-sense-hat').Leds;
const sense = require("sense-hat-led");
const mqtt = require('mqtt');
const os = require('os');

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

let delay = 5000;
let sendDataTimer;

const getSensorData = () => {
    return new Promise((resolve, reject) => {
        IMU.getValue((err, data) => {
            if (err != null) {
                console.error('Could not read sensor data: ', err);
                return;
            }
            resolve(data);
        });
    });
};

client.on('message', (topic, message) => {
    console.log('message:', topic, message.toString());
    if (topic.includes("$iothub/methods/POST/")) {
        const methodName = topic.split("$iothub/methods/POST/")[1].split("/")[0];
        const rid = topic.split("=")[1];
        const args = JSON.parse(message.toString());
        if (methods[methodName]) {
            methods[methodName](rid, args);
        }
    } else if (topic.includes("$iothub/twin/PATCH/properties/desired/")) {
        const version = topic.split("=")[1];
        desiredHandler(version, JSON.parse(message.toString()));
    }
});

const methods = {
    'red': (rid, args) => {
        matrix.clear([255, 0, 0]);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, JSON.stringify("red!!"));
    },
    'white': (rid, args) => {
        matrix.clear([255, 255, 255]);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, JSON.stringify("white!!"));
    },
    'batsu': (rid, args) => {
        matrix.setPixels(cross);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, JSON.stringify("batsu!!"));
    }
};

const desiredHandler = (version, desired) => {
    if (desired && desired.delay && 100 < Number(desired.delay)) {
        if (sendDataTimer) clearInterval(sendDataTimer);
        delay = Number(desired.delay);
        sendSensorData(delay);
    }
};

const sendMessage = message => {
    if (typeof message != 'string') message = JSON.stringify(message);
    client.publish(pubMessageTopic, message);
};

const sendReportProperty = message => {
    if (!message) {
        const message = {
            sample: {
                location: {
                    region: 'JP'
                }
            }
        }
    }
    client.publish(pubTwinReportedTopic + '1', JSON.stringify(reported));
};

const formatData = raw => {
    const data = {};
    data.accelX = raw.accel.x;
    data.accelY = raw.accel.y;
    data.accelZ = raw.accel.z;
    data.temperature = raw.temperature;
    data.humidity = raw.humidity;
    data.time = raw.timestamp;

    return data;
}

const sendSensorData = delay => {
    sendDataTimer = setInterval(() => {
        getSensorData().then(rawData => {
            // console.log('sensorData', sensorData);
            const sensorData = formatData(rawData);
            sendMessage(JSON.stringify(sensorData));
        });
    }, delay);
};

const getIpAdresses = () => {
    const ifs = os.networkInterfaces();
    const ipAddress = {
        ip: {}
    };
    for (let i in ifs) {
        if (!ipAddress.ip[i]) ipAddress.ip[i] = [];
        ifs[i].forEach(info => {
            ipAddress.ip[i].push(info.address);
        });
    }
    return ipAddress;
}

client.on('connect', () => {
    client.subscribe(subMessageTopic);
    client.subscribe(subTwinResponseTopic);
    client.subscribe(subTwinDesiredTopic);
    client.subscribe(subMethodTopic);
});

/////////////////////////////////////////////////////////////////////

sendSensorData(delay);
sense.showMessage("Connecting Azure IoT Hub with MQTT!", 0.1, [255, 255, 255], [50, 50, 50]);

sendMessage(getIpAdresses());

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