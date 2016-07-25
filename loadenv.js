process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.on('SIGINT', () => process.exit());
