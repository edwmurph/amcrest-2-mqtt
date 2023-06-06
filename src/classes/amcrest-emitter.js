const axios = require('axios');
const Auth = require('http-auth-client');
const { EventEmitter } = require('node:events');
const log = require('../util/log');

class AmcrestEmitter extends EventEmitter {

  constructor({ host, user, password }) {
    super();

    if ( !password ) {
      throw new Error('missing password');
    }

    const url_base = `http://${ host }`;

    Object.assign( this, {
      host,
      user,
      password,
      attach_url: `${ url_base }/cgi-bin/eventManager.cgi?action=attach&codes=[All]`
    });
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
        event[ key ] = key === 'data' && value ? JSON.parse( value ) : value;
      }

      this.emit( 'event', { event, raw } );
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

    log.info('listening for amcrest events...');
  }
}

module.exports = AmcrestEmitter;
