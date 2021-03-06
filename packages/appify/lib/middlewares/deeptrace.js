'use strict'

const { DeepTraceAgent, NativeHttpReporter } = require('@deeptrace/agent')
const { URL } = require('url')

/**
 * @param {Object} config DeepTrace's configuration object.
 * @param {Function} debug Instance of debug.
 * @return {Function} Middleware.
 */
module.exports = (config, debug) => {
  const reporter = config.dsn
    ? new NativeHttpReporter({ ...config, dsn: new URL(config.dsn) })
    : null

  if (!reporter) {
    debug('missing deeptrace dsn, traces won\'t be reported')
  }

  const agent = new DeepTraceAgent(reporter, config)

  return (req, res, next) => {
    agent.bind(req, res, (context) => {
      Object.defineProperty(req, 'deeptrace', context)
      next()
    })
  }
}
