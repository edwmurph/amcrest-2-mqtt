function log( level, ...args ) {
  console.log( '[%s] %s:', new Date().toISOString(), level, ...args );
}

function info( ...args ) {
  log( 'INFO', ...args );
}

function warn( ...args ) {
  log( 'WARN', ...args );
}

function error( ...args ) {
  log( 'ERROR', ...args );
}

module.exports = { info, warn, error };
