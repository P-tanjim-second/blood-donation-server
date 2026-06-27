const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URL;

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


        app.post('/donation-request', async (req, res) => {
            const data = req.body;
            const result = await donationRequestCollection.insertOne(data);
            res.json({ status: 200, message: "Donation Request Added Successfully." })
        });


        app.get('/my-donation-requests/:email', async (req, res) => {
            const email = req.params.email;
            const status = req.query.status;
            const page = req.query.page;
            const limit = parseInt(req.query.limit);
            const query = { requesterEmail: email };
            if (status) {
                query.status = status;
            }

            const skip = (page - 1) * limit

            const total =   await donationRequestCollection.countDocuments(query);
            const result = await donationRequestCollection.find(query).skip(skip).limit(limit).toArray();
            res.json({ status: 200, requests: result, total });
        })


        app.get('/all-requests', async (req, res) =>{
            const status = req.query.status;
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const query = {}
            if(status){
                query.status = status;
            }

            const skip = (page-1) * 10;

            const total = await donationRequestCollection.countDocuments(query);
            const result = await donationRequestCollection.find(query).skip(skip).limit(limit).toArray();
            res.json({status: 200, requests: result, total});
        })


        app.get('/request/:id', async (req, res) =>{
            const id = req.params.id;
            const result = await donationRequestCollection.findOne({_id: new ObjectId(id)});
            res.json({status: 200, request: result});
        })
 

        app.get('/users-count', async (req, res) => {
            const role = req.query.role;
            const query = {}
            if (role) {
                query.role = role;
            }
            const result = await userCollection.countDocuments(query);
            res.json({status: 200, total: result})
        })



        app.get('/total_funding', async (req, res) => {
            const result = await fundingCollection.findOne({_id: new ObjectId(process.env.FUNDING_ID)});
            res.json({status: 200, funding: result?.totalFunding || 0});
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