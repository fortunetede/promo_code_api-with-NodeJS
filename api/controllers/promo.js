const mongoose = require('mongoose')
const moment = require('moment')
const gpl = require('google-polyline')

// MODELS
const Promo = require('../models/promo')
const Event = require('../models/event')

// PARTIALS
const Utils = require('../partials/utils')

// CONTROLLERS
exports.createPromo = async (req, res, next) => {
    const eventId = req.body.event_id
    const amount = req.body.amount
    const expiry_date = req.body.expiry_date
    const event_radius = req.body.event_radius

    // check if event exist
    const event = await Event.findOne({
        _id: eventId
    })
    if (event == null) return event.status(400).json({
        message: 'event id does not exist'
    })

    // create promo code
    const promo = await new Promo({
        _id: new mongoose.Types.ObjectId,
        event: eventId,
        code: Utils.uniqCode(),
        amount: amount,
        radius: event_radius,
        active: true,
        expiry_date: expiry_date,
        created: moment().format('YYYY-MM-DD '),
    }).save()
    if (promo._id) {
        return res.status(201).json({
            promo: {
                id: promo._id,
                code: promo.code,
                amount: promo.amount,
                event: promo.event,
                radius: promo.radius,
                active: promo.active,
                expiry_date: promo.expiry_date,
                created: promo.created
            }
        })
    }
    return res.status(400).json({
        error: promo
    })
}

exports.getAllPromos = async (req, res, next) => {
    const promos = await Promo.find()
        .populate('event')
        .populate({
            path: 'event',
            populate: {
                path: 'location'
            }
        })
    return res.status(200).json({
        count: promos.length,
        promos: promos
    })
}

exports.getAllActivePromos = async (req, res, next) => {
    const active_promos = await Promo.find({
            active: true
        })
        .populate('event')
        .populate({
            path: 'event',
            populate: {
                path: 'location',
            }
        })
    return res.status(200).json({
        count: active_promos.length,
        promos: active_promos
    })
}

exports.deactivatePromo = async (req, res, next) => {
    const promoId = req.params.promoId
    const promo = await Promo.updateOne({
            _id: promoId
        }, {
            $set: {
                active: false
            }
        })
        .populate('event')
    if (promo.ok == 1) {
        return res.status(200).json({
            message: "promo has been deactivated"
        })
    }
    return res.status(400).json({
        error: "Could not deactivated the promo"
    })
}

exports.changePromoRadius = async (req, res, next) => {
    const promoId = req.params.promoId
    const radius = req.body.radius
    const promo = await Promo.updateOne({
            _id: promoId
        }, {
            $set: {
                radius: radius
            }
        })
        .populate('event')
    if (promo.ok == 1) {
        return res.status(200).json({
            message: "promo radius has been updated"
        })
    }
    return res.status(400).json({
        error: "Could not update promo radius"
    })
}

exports.validatePromo = async (req, res, next) => {
    const code = req.body.code
    const origin = req.body.origin
    const destination = req.body.destination

    const promo = await Promo.findOne({
        code: code
    }).populate('event')
    // check if code exist
    if (promo == null) return res.status(400).json({
        error: 'Promo code does not exist'
    })
    // check if code has expired
    if (promo.expiry_date < moment().format('YYYY-MM-DD')) return res.status(400).json({
        error: 'Promo code has expired'
    })
    // generate polyline
    const originPoint = await Utils.getLocationPointCodinate(origin)
    const destinationPoint = await Utils.getLocationPointCodinate(destination)

    const polyline = gpl.encode([
        [originPoint.results[0].geometry.location.lat, originPoint.results[0].geometry.location.lng],
        [destinationPoint.results[0].geometry.location.lat, destinationPoint.results[0].geometry.location.lng]
    ])
    // return result
    return res.status(200).json({
        validate_promo: {
            promo: promo,
            polyline: polyline,
            origin: origin,
            destination: destination,
        },

    })
}

exports.getOnePromo = async (code) => {
    return await Promo.findOne({
            code: code
        })
        .populate('event')
        .populate({
            path: 'event',
            populate: {
                path: 'location',
            }
        })
}