require('dotenv').config();

const mqtt = require('mqtt');
const AmcrestEmitter = require('./classes/amcrest-emitter');
const log = require('./util/log');

const {
  AMCREST_HOST,
  AMCREST_USER,
  AMCREST_PASSWORD,
  MQTT_URL
} = process.env;

log.info( 'env vars:', {
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
    log.info('========== DOORBELL PRESSED ==========');

    const mqtt_payload = JSON.stringify({
      date: new Date().toISOString()
    });

    client.publish( 'amcrest-2-mqtt/doorbell1/doorbell-pressed', mqtt_payload );
  }

  log.info( event );
});
