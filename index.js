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
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    req.decoded = decoded;
    console.log(req.decoded, 'verify token');
    next();
  });
};
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
    const tasksCollection = microDB.collection('tasks');
    const verifyBuyer = async (req, res, next) => {
      const email = req.decoded.email;
      console.log(email, 'buyer');
      const findBuyer = await usersCollection.findOne({ email: email });
      if (findBuyer) {
        const buyer = findBuyer.role === 'buyer';
        if (buyer) {
          next();
        } else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      } else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    };
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email: email });
      res.send(result);
    });
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
    app.post('/jwt', async (req, res) => {
      console.log(req.body?.email);
      const token = jwt.sign(
        { email: req.body?.email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: '1h',
        }
      );
      res.send({
        success: true,
        token,
        message: 'JWT token generated successfully',
      });
    });
    app.post('/tasks', verifyToken, verifyBuyer, async (req, res) => {
      try {
        if (req.decoded?.email !== req.body?.buyerEmail) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        console.log(req.body);
        const result = await tasksCollection.insertOne(req.body);
        const user = await usersCollection.findOne({
          email: req.body.buyerEmail,
        });

        if (result.insertedId && user) {
          const totalCost = req.body.required_workers * req.body.payable_amount;
          const newBalance = user.coins - totalCost;
          await usersCollection.updateOne(
            { email: req.body.buyerEmail },
            {
              $set: {
                coins: newBalance,
              },
            }
          );
        }
        res.status(201).send({
          success: true,
          data: result,
          message: 'task item added successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while adding task item',
        });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`);
});
