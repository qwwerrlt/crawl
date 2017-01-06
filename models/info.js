'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
require('../common/connectMongo');

let schema = new Schema({
	title: String,
	summary: String,
	author: String,
	publishDate: Date,
	source: String,
	content: String,
	raw: String,
	tag: String,
	link: String
}, {collection: 'info', timestamps: true});

module.exports = mongoose.model('Info', schema);
