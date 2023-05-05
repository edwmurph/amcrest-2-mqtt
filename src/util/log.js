function log( level, ...args ) {
  console.log( '[%s] %s:', new Date().toISOString(), level, ...args );
}

function info( ...args ) {
  log( 'INFO', ...args );
}

module.exports = { info };
