module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@reststate/client)/)'],
};
