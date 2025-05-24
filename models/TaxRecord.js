const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaxRecordSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    output: { type: Schema.Types.Mixed, required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaxRecord", TaxRecordSchema, "TaxRecord");