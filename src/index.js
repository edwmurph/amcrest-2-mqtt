require('dotenv').config();

const mqtt = require('mqtt');
const AmcrestEmitter = require('./classes/amcrest-emitter');

const client = mqtt.connect( process.env.MQTT_URL );

const amcrestEmitter = new AmcrestEmitter({
  host: process.env.AMCREST_HOST,
  user: process.env.AMCREST_USER,
  password: process.env.AMCREST_PASSWORD
});

amcrestEmitter.connect();

amcrestEmitter.on( 'event', ({ event }) => {
  if ( event.Code === 'PhoneCallDetect' && event.action === 'Start' ) {
    console.log('DOORBELL PRESSED');

    client.publish( 'amcrest-2-mqtt/doorbell1/doorbell-pressed', {
      date: new Date().toISOString()
    });
  }

  console.log( event );
});
