const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const uri = process.env.MONGODB_URL;

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
    const authorization = req.headers?.authorization;
    if(!authorization){
        return res.status(401).json({status: 401, message: "unauthorized"});
    }
    const token = authorization.split(" ")[1];
    if (!token) {
        return res.status(401).json({status: 401, message: "unauthorized"});
    }

    try {
        const {payload} =await jwtVerify(token, JWKS)
    } catch {
        return res.status(403).json({status: 403, message: "Forbidden"})
    }
    
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        const db = client.db('blood-donation')
        const donationRequestCollection = db.collection('donation_requests');
        const userCollection = db.collection('user');
        const fundingCollection = db.collection('fundings')


        app.post('/donation-request', verifyToken, async (req, res) => {
            const data = req.body;
            const result = await donationRequestCollection.insertOne(data);
            res.json({ status: 200, message: "Donation Request Added Successfully." })
        });


        app.get('/my-donation-requests/:email', verifyToken,async (req, res) => {
            const email = req.params.email;
            const status = req.query.status;
            const page = req.query.page;
            const limit = parseInt(req.query.limit);
            const query = { requesterEmail: email };
            if (status) {
                query.status = status;
            }

            const skip = (page - 1) * limit

            const total = await donationRequestCollection.countDocuments(query);
            const result = await donationRequestCollection.find(query).skip(skip).limit(limit).toArray();
            res.json({ status: 200, requests: result, total });
        })


        app.get('/all-requests', async (req, res) => {
            const status = req.query.status;
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const query = {}
            if (status) {
                query.status = status;
            }

            const skip = (page - 1) * 10;

            const total = await donationRequestCollection.countDocuments(query);
            const result = await donationRequestCollection.find(query).skip(skip).limit(limit).toArray();
            res.json({ status: 200, requests: result, total });
        })


        app.get('/request/:id', verifyToken,async (req, res) => {
            const id = req.params.id;
            const result = await donationRequestCollection.findOne({ _id: new ObjectId(id) });
            res.json({ status: 200, request: result });
        })
        app.patch('/request/:id',verifyToken, async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const result = await donationRequestCollection.updateOne({ _id: new ObjectId(id) }, { $set: body });
            res.json({ status: 200, request: result });
        })
        app.delete('/request/:id',verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await donationRequestCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 1) {
                res.json({ status: 200, deleted: true });
            }
            else {
                res.json({ status: 404, deleted: false });
            }
        })


        app.get('/users-count',verifyToken, async (req, res) => {
            const userRole = req.query.userRole;
            const query = {}
            if (userRole) {
                query.userRole = userRole;
            }
            const result = await userCollection.countDocuments(query);
            res.json({ status: 200, total: result })
        })


        app.get('/donors', async (req, res) => {
            const bloodGroup = req.query.bloodGroup?.trim();
            const district = req.query.district?.trim();
            const upazila = req.query.upazila?.trim();
            const query = {}
            if (bloodGroup) {
                query.bloodGroup = bloodGroup;
            }
            if (district) {
                query.district = district;
            }
            if (upazila) {
                query.upazila = upazila;
            }
            query.userRole = "donor";
            console.log(query)
            const total = await userCollection.countDocuments({userRole: "donor"})
            const result = await userCollection.find(query).toArray();
            res.json({ status: 200, donors: result, total })
        })


        app.patch('/user/:id', verifyToken,async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const result = await userCollection.updateOne({ _id: new ObjectId(id) }, { $set: body });
            res.json({ status: 200, user: result });
        })


        app.get('/all-users', verifyToken,async (req, res) => {
            try {
                const page = parseInt(req.query.page, 10) || 1;
                const limit = parseInt(req.query.limit, 10) || 10;
                const status = req.query.status;
                const userRole = req.query.userRole;

                const skip = (page - 1) * limit;

                const query = {};
                if (status) {
                    query.status = status;
                }
                if (userRole) {
                    query.userRole = userRole;
                }

                const total = await userCollection.countDocuments(query);
                const result = await userCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                const totalPages = Math.ceil(total / limit);

                res.json({
                    status: 200,
                    users: result,
                    total,
                    totalPages
                });

            } catch (error) {
                console.error("Failed to fetch users:", error);
                res.status(500).json({ status: 500, message: "Internal Server Error" });
            }
        })



        app.get('/total_funding', async (req, res) => {
            const result = await fundingCollection.findOne({ _id: new ObjectId(process.env.FUNDING_ID) });
            res.json({ status: 200, funding: result?.totalFunding || 0 });
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('Server is running...');
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})