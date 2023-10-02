const axios = require('axios');
const Auth = require('http-auth-client');
const { EventEmitter } = require('node:events');
const log = require('../util/log');

const HEALTH_CHECK_TIMEOUT = 60e3 * 7;

function parseObject( str ) {
  try {
    return JSON.parse( str );
  } catch ( ex ) {
    log.error( ex );
    return str;
  }
}

class AmcrestEmitter extends EventEmitter {

  constructor({ host, user, password }) {
    super();

    if ( !password ) {
      throw new Error('missing password');
    }

    const url_base = `http://${ host }`;

    Object.assign( this, {
      last_ntp_check: Date.now(),
      host,
      user,
      password,
      attach_url: `${ url_base }/cgi-bin/eventManager.cgi?action=attach&codes=[All]`
    });
  }

  #ms_to_duration( ms ) {
    const pad = ( n, z = 2 ) => ( '00' + n ).slice( -z );

    return [
      pad( ms/3.6e6|0 ),
      pad( ( ms%3.6e6 )/6e4 | 0 ),
      pad( ( ms%6e4 )/1000|0 )
    ].join(':');
  }

  async #get_digest_auth( url ) {
    try {
      await axios.get( url );
      throw new Error('failed to get auth challenge');
    } catch ( ex ) {
      if ( ex.response?.status !== 401 ) {
        throw ex;
      } else {
        const challenges = Auth.parseHeaders( ex.response.headers['www-authenticate'] );

        const auth = Auth.create( challenges );

        auth.credentials( this.user, this.password );

        return auth.authorization( 'GET', url );
      }
    }
  }

  on_data( data ) {
    const raw = Buffer.from( data ).toString().trim();

    const events = raw.split('--myboundary').filter( Boolean );

    for ( const raw_event of events ) {
      const [
        content_type,
        content_length,
        data
      ] = raw_event
        .split('\r\n')
        .map( str => str.trim() )
        .filter( Boolean );

      const event = {
        date: new Date().toISOString(),
        'Content-Type': content_type.split(':')[1].trim(),
        'Content-Length': content_length.split(':')[1].trim()
      };

      for ( const datum of data.split(';') ) {
        const [ key, value ] = datum.split('=');
        event[ key ] = parseObject( value );
      }

      if ( event.Code === 'NTPAdjustTime' ) {
        this.last_ntp_check = Date.now();
      }

      this.emit( 'event', { event, raw } );
    }
  }

  health_check() {
    const ms = Date.now() - this.last_ntp_check;

    log.info( `time since last ntp check: ${ this.#ms_to_duration( ms ) }` );

    if ( ms > HEALTH_CHECK_TIMEOUT ) {
      log.info('exiting because last ntp check was more than timeout');
      process.exit( 1 );
    }
  }

  async connect() {
    const stream = await axios.get( this.attach_url, {
      responseType: 'stream',
      headers: {
        ['Authorization']: await this.#get_digest_auth( this.attach_url )
      }
    });

    stream.data.on( 'data', this.on_data.bind( this ) );

    setInterval( this.health_check.bind( this ), 60e3 );

    log.info('listening for amcrest events...');
  }
}

module.exports = AmcrestEmitter;
