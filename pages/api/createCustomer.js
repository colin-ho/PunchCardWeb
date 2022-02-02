import { firestore } from '../../lib/firebase';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function CreateCustomer(req, res) {
    const { userId,email,name} = req.body;
    const customer = await stripe.customers.create({
        metadata: {
            firebaseUID: userId
        },
        email:email,
        name:name
    });
    res.json({ customer: customer });
}