const axios = require('axios');
const Auth = require('http-auth-client');
const { EventEmitter } = require('node:events');

class AmcrestEmitter extends EventEmitter {

  constructor({ host, user, password }) {
    super();

    if ( !password ) {
      throw new Error('missing password');
    }

    console.log({ host, user });

    const url_base = `http://${ host }`;

    Object.assign( this, {
      host,
      user,
      password,
      attach_url: `${ url_base }/cgi-bin/eventManager.cgi?action=attach&codes=[All]`
    });
  }

  async #get_axios_options() {
    try {
      await axios.get( this.attach_url );
      throw new Error('failed to get auth challenge');
    } catch ( ex ) {
      if ( ex.response?.status !== 401 ) {
        throw ex;
      } else {
        const challenges = Auth.parseHeaders( ex.response.headers['www-authenticate'] );

        const auth = Auth.create( challenges );

        auth.credentials( this.user, this.password );

        return {
          responseType: 'stream',
          headers: {
            ['Authorization']: auth.authorization( 'GET', this.attach_url )
          }
        };
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
    console.log('requesting auth challenge...');

    const options = await this.#get_axios_options();

    console.log('completed auth challenge!');

    const stream = await axios.get( this.attach_url, options );

    stream.data.on( 'data', this.on_data.bind( this ) );

    console.log('listening for amcrest events...');
  }
}

module.exports = AmcrestEmitter;
