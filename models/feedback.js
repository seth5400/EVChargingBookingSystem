const mongoose = require('mongoose');

const feedbackSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Assuming the Product model is used for stations
        required: true
    },
    issueType: {
        type: String,
        required: true,
        enum: ['Station Faulty', 'Charging Issue', 'Other'] // You can add more categories
    },
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
