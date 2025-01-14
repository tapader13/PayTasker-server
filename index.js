require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
    const microDB = client.db('microDB');
    const usersCollection = microDB.collection('users');

    app.post('/users', async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.body.email });
        if (user) {
          return res.status(200).send({
            success: true,
            message: 'user already exists',
          });
        }
        const result = await usersCollection.insertOne(req.body);
        res.status(201).send({
          success: true,
          data: result,
          message: 'user logged in successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while creating user',
        });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`);
});
