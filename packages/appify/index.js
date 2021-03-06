'use strict'

/**
 * @module Appify
 */

const config = require('@deeptrace/config')
const commons = require('@deeptrace/commons')
const factory = require('./lib/appify-factory.js')
const withConfig = require('./lib/with-config-factory.js')

module.exports.config = config
module.exports.appify = factory
module.exports.withConfig = withConfig

module.exports.BadRequestHttpError = commons.BadRequestHttpError
module.exports.ConflictHttpError = commons.ConflictHttpError
module.exports.DomainError = commons.DomainError
module.exports.CommonError = commons.CommonError
module.exports.ForbiddenHttpError = commons.ForbiddenHttpError
module.exports.GoneHttpError = commons.GoneHttpError
module.exports.HttpError = commons.HttpError
module.exports.InfrastructureError = commons.InfrastructureError
module.exports.InternalServerErrorHttpError = commons.InternalServerErrorHttpError
module.exports.LockedHttpError = commons.LockedHttpError
module.exports.NotFoundHttpError = commons.NotFoundHttpError
module.exports.PaymentRequiredHttpError = commons.PaymentRequiredHttpError
module.exports.ServerFaultHttpError = commons.ServerFaultHttpError
module.exports.ServiceUnavailableHttpError = commons.ServiceUnavailableHttpError
module.exports.TooManyRequestsHttpError = commons.TooManyRequestsHttpError
module.exports.UnauthorizedHttpError = commons.UnauthorizedHttpError
module.exports.UnprocessableEntityHttpError = commons.UnprocessableEntityHttpError
module.exports.UserFaultHttpError = commons.UserFaultHttpError
