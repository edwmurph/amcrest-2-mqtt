require('dotenv').config();

const mqtt = require('mqtt');
const AmcrestEmitter = require('./classes/amcrest-emitter');

const {
  AMCREST_HOST,
  AMCREST_USER,
  AMCREST_PASSWORD,
  MQTT_URL
} = process.env;

console.log( 'env vars:', {
  AMCREST_HOST,
  AMCREST_USER,
  MQTT_URL,
  AMCREST_PASSWORD: AMCREST_PASSWORD ? '***' : AMCREST_PASSWORD
});

const client = mqtt.connect( MQTT_URL );

const amcrestEmitter = new AmcrestEmitter({
  host: AMCREST_HOST,
  user: AMCREST_USER,
  password: AMCREST_PASSWORD
});

amcrestEmitter.connect();

amcrestEmitter.on( 'event', ({ event }) => {
  if ( event.Code === 'PhoneCallDetect' && event.action === 'Start' ) {
    console.log('========== DOORBELL PRESSED ==========');

    client.publish( 'amcrest-2-mqtt/doorbell1/doorbell-pressed', {
      date: new Date().toISOString()
    });
  }

  console.log( event );
});
