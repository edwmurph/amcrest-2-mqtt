require('dotenv').config();

const AmcrestEmitter = require('./classes/amcrest-emitter');

const amcrestEmitter = new AmcrestEmitter({
  host: process.env.AMCREST_HOST,
  user: process.env.AMCREST_USER,
  password: process.env.AMCREST_PASSWORD
});

amcrestEmitter.connect();

amcrestEmitter.on( 'event', ({ event }) => {
  if ( event.Code === 'PhoneCallDetect' && event.action === 'Start' ) {
    console.log('DOORBELL PRESSED');
  }

  console.log( event );
});
