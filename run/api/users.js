const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getAuth } = require('firebase-admin/auth');
const uuidAPIKey = require('uuid-apikey');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { enqueueTask } = require('../lib/tasks');
const authMiddleware = require('../middlewares/auth');
const { encrypt } = require('../lib/crypto');

router.get('/me/apiToken', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid, ['apiKey', 'apiToken']);

        res.status(200).json({ apiToken: user.apiToken });
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.post('/me/setCurrentWorkspace', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid);

        res.status(200).json(user);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.post('/', async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.firebaseUserId) {
            console.log(data);
            throw new Error('POST [/api/users] Missing parameter.');
        }

        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        const authUser = await getAuth().getUser(data.firebaseUserId);
        const customer = await stripe.customers.create({
            email: authUser.email
        });

        await db.createUser(data.firebaseUserId, {
            email: authUser.email,
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: 'free'
        });

        await enqueueTask('processUser', {
            uid: data.firebaseUserId,
            secret: process.env.AUTH_SECRET
        });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

module.exports = router;
