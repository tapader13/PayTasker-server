require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const paymentCollection = microDB.collection('payment');
    const submissionCollection = microDB.collection('submission');
    const withdrowCollection = microDB.collection('withdrow');
    const notificationCollection = microDB.collection('notification');
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
    const verifyWorker = async (req, res, next) => {
      const email = req.decoded.email;
      console.log(email, 'worker verified');
      const findWorker = await usersCollection.findOne({ email: email });
      if (findWorker) {
        const worker = findWorker.role === 'worker';
        if (worker) {
          next();
        } else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      } else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log(email, 'admin verified');
      const findAdmin = await usersCollection.findOne({ email: email });
      if (findAdmin) {
        const admin = findAdmin.role === 'admin';
        if (admin) {
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
          expiresIn: '1d',
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
    app.get('/tasks', verifyToken, verifyBuyer, async (req, res) => {
      try {
        const result = await tasksCollection
          .find({ buyerEmail: req.decoded.email })
          .toArray();
        res.status(200).send({
          success: true,
          data: result,
          message: 'task items fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while getting task items',
        });
      }
    });
    app.put('/tasks/:id', verifyToken, verifyBuyer, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };

        const result = await tasksCollection.updateOne(filter, {
          $set: req.body,
        });
        res.status(200).send({
          success: true,
          data: result,
          message: 'task item updated successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while updating task item',
        });
      }
    });
    app.delete('/tasks/:id', verifyToken, verifyBuyer, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const findTask = await tasksCollection.findOne(filter);
        const result = await tasksCollection.deleteOne(filter);
        if (result.deletedCount > 0) {
          const user = await usersCollection.findOne({
            email: req.decoded.email,
          });
          const newBalance =
            user.coins + findTask.required_workers * findTask.payable_amount;
          await usersCollection.updateOne(
            { email: req.decoded.email },
            {
              $set: {
                coins: newBalance,
              },
            }
          );
          res.status(200).send({
            success: true,
            data: result,
            message: 'task item deleted successfully',
          });
        }
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while deleting task item',
        });
      }
    });
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(req.body, 123);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        description: 'Payment for coin',
        payment_method_types: ['card'],
      });
      console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post('/payment', verifyToken, async (req, res) => {
      try {
        const payment = req.body;
        console.log(payment);
        const result = await paymentCollection.insertOne(payment);
        if (result.insertedId) {
          const user = await usersCollection.findOne({
            email: req.body.email,
          });
          const newBalance = user.coins + req.body.coins;
          await usersCollection.updateOne(
            { email: req.body.email },
            {
              $set: {
                coins: newBalance,
              },
            }
          );
          res.send({
            success: true,
            data: result,
            message: 'payment added successfully',
          });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: 'error while adding payment',
        });
      }
    });
    app.get('/payments-history', verifyToken, verifyBuyer, async (req, res) => {
      try {
        const result = await paymentCollection
          .find({ email: req.decoded.email })
          .toArray();
        console.log(result);
        res.status(200).send({
          success: true,
          data: result,
          message: 'payment history fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while getting payment history',
        });
      }
    });
    app.get('/tasks-worker', verifyToken, verifyWorker, async (req, res) => {
      try {
        const result = await tasksCollection
          .aggregate([
            {
              $match: {
                required_workers: { $gt: 0 },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'buyerEmail',
                foreignField: 'email',
                as: 'buyerInfo',
              },
            },
            {
              $unwind: '$buyerInfo',
            },
            {
              $project: {
                username: '$buyerInfo.name',
                required_workers: '$required_workers',
                payable_amount: '$payable_amount',
                task_title: '$task_title',
                task_detail: '$task_detail',
                completion_date: '$completion_date',
                submission_info: '$submission_info',
                task_image_url: '$task_image_url',
                buyerEmail: '$buyerEmail',
              },
            },
          ])
          .toArray();
        console.log(result);
        res.status(200).send({
          success: true,
          data: result,
          message: 'task items fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while getting task items',
        });
      }
    });
    app.get(
      '/tasks-worker/:id',
      verifyToken,
      verifyWorker,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const result = await tasksCollection
            .aggregate([
              {
                $match: filter,
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'buyerEmail',
                  foreignField: 'email',
                  as: 'buyerInfo',
                },
              },
              {
                $unwind: '$buyerInfo',
              },
              {
                $project: {
                  username: '$buyerInfo.name',
                  required_workers: '$required_workers',
                  payable_amount: '$payable_amount',
                  task_title: '$task_title',
                  task_detail: '$task_detail',
                  completion_date: '$completion_date',
                  submission_info: '$submission_info',
                  task_image_url: '$task_image_url',
                  buyerEmail: '$buyerEmail',
                },
              },
            ])
            .toArray();
          res.status(200).send({
            success: true,
            data: result,
            message: 'task item fetched successfully',
          });
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while getting task item',
          });
        }
      }
    );
    app.post(
      '/tasks-worker/submit',
      verifyToken,
      verifyWorker,
      async (req, res) => {
        try {
          const result = await submissionCollection.insertOne(req.body);
          res.status(200).send({
            success: true,
            data: result,
            message: 'task submission added successfully',
          });
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while adding task submission',
          });
        }
      }
    );
    app.get(
      '/worker-submissions',
      verifyToken,
      verifyWorker,
      async (req, res) => {
        try {
          const result = await submissionCollection
            .find({ worker_email: req.decoded.email })
            .toArray();
          console.log(result);
          res.status(200).send({
            success: true,
            data: result,
            message: 'worker submissions fetched successfully',
          });
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while getting worker submissions',
          });
        }
      }
    );
    app.post(
      '/worker-withdrawals',
      verifyToken,
      verifyWorker,
      async (req, res) => {
        try {
          const result = await withdrowCollection.insertOne(req.body);
          res.status(200).send({
            success: true,
            data: result,
            message: 'worker withdrawal added successfully',
          });
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while adding worker withdrawal',
          });
        }
      }
    );
    app.get('/admin-states', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const totalWorkers = await usersCollection
          .find({ role: 'worker' })
          .count();
        const totalBuyers = await usersCollection
          .find({ role: 'buyer' })
          .count();
        const totalPayment = await paymentCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalPrice: { $sum: '$price' },
              },
            },
          ])
          .toArray();
        const totalcoins = await usersCollection
          .aggregate([
            {
              $match: {
                role: { $ne: 'admin' },
              },
            },
            {
              $group: {
                _id: null,
                totalCoins: { $sum: '$coins' },
              },
            },
          ])
          .toArray();
        const totalAvailableCoins =
          totalcoins.length > 0 ? totalcoins[0].totalCoins : 0;
        const totalPayments =
          totalPayment.length > 0 ? totalPayment[0].totalPrice : 0;
        const witdrowRequest = await withdrowCollection
          .find({ status: 'pending' })
          .toArray();
        res.status(200).send({
          success: true,
          states: {
            totalWorkers,
            totalBuyers,
            totalPayments,
            totalAvailableCoins,
          },
          withdrowReq: witdrowRequest,
          message: 'admin states fetched successfully',
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: 'error while getting admin states',
        });
      }
    });
    app.patch(
      '/approve-withdrawal/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          console.log(req.body.coins);
          const result = await withdrowCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                status: 'approved',
              },
            }
          );
          if (result.modifiedCount > 0) {
            const user = await usersCollection.findOne({
              email: req.body.email,
            });
            const userCoins = user.coins;
            const newCoins = userCoins - req.body.coins;
            const updateCoins = await usersCollection.updateOne(
              { email: req.body.email },
              {
                $set: {
                  coins: newCoins,
                },
              }
            );
            if (updateCoins.modifiedCount > 0) {
              res.status(200).send({
                success: true,
                data: result,
                message: 'withdrawal approved successfully',
              });
            }
          }
        } catch (error) {
          res.status(500).send({
            success: false,
            message: 'error while approving withdrawal',
          });
        }
      }
    );
    app.get('/manage-users', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).send({
          success: true,
          data: result,
          message: 'users fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while getting users',
        });
      }
    });
    app.patch(
      '/role-update/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const updateDoc = {
            $set: {
              role: req.body.role,
            },
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.status(200).send({
            success: true,
            data: result,
            message: 'user role updated successfully',
          });
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while updating user role',
          });
        }
      }
    );
    app.delete(
      '/users-delete/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const result = await usersCollection.deleteOne(filter);
          if (result.deletedCount > 0) {
            res.status(200).send({
              success: true,
              data: result,
              message: 'user deleted successfully',
            });
          }
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while deleting user',
          });
        }
      }
    );
    app.get('/tasks-manage', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await tasksCollection.find().toArray();
        res.status(200).send({
          success: true,
          data: result,
          message: 'tasks fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while getting tasks',
        });
      }
    });
    app.delete(
      '/tasks-manage/:id',
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const deleteTask = await tasksCollection.findOneAndDelete({
            _id: new ObjectId(req.params.id),
          });
          if (deleteTask.deletedCount > 0) {
            res.status(200).send({
              success: true,
              data: deleteTask,
              message: 'task deleted successfully',
            });
          }
        } catch (error) {
          res.status(500).send({
            success: false,
            message: 'error while deleting task',
          });
        }
      }
    );
    app.get('/best-workers', async (req, res) => {
      try {
        const result = await usersCollection
          .find({ role: 'worker' })
          .sort({ coins: -1 })
          .limit(6)
          .toArray();
        res.status(200).send({
          success: true,
          data: result,
          message: 'best workers fetched successfully',
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: 'error while fetching best workers',
        });
      }
    });
    //a lot of toto work here should be done
    app.get('/buyer-states', verifyToken, verifyBuyer, async (req, res) => {
      try {
        const totalTaskCount = await tasksCollection.countDocuments({
          buyerEmail: req.decoded.email,
        });
        const totalPendingTasks = await tasksCollection
          .aggregate([
            {
              $match: {
                buyerEmail: req.decoded.email,
              },
            },
            {
              $group: {
                _id: null,
                pendingTasks: { $sum: '$required_workers' },
              },
            },
          ])
          .toArray();
        const pendinTaskCount =
          totalPendingTasks.length > 0 ? totalPendingTasks[0].pendingTasks : 0;
        const submissionPendingTasks = await submissionCollection
          .find({
            buyer_email: 'tofazzal@gmail.com',
            status: 'pending',
          })
          .toArray();
        res.status(200).send({
          success: true,
          states: {
            totalTaskCount,
            pendingTasks: pendinTaskCount,
            totalPayment: 100, //todo for next update
          },
          submissions: submissionPendingTasks,
          message: 'buyer states fetched successfully',
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: 'error while fetching buyer states',
        });
      }
    });
    app.patch(
      '/approve-submission',
      verifyToken,
      verifyBuyer,
      async (req, res) => {
        try {
          const submission = await submissionCollection.findOneAndUpdate(
            { _id: new ObjectId(req.body.id) },
            {
              $set: {
                status: 'approve',
              },
            },
            { returnDocument: 'after' }
          );
          if (submission.status === 'approve') {
            const user = await usersCollection.findOne({
              email: submission.worker_email,
            });
            if (user) {
              const userCoins = user.coins;
              const newCoins = userCoins + submission.payable_amount;
              await usersCollection.updateOne(
                { email: submission.worker_email },
                {
                  $set: {
                    coins: newCoins,
                  },
                }
              );
              res.status(200).send({
                success: true,
                data: submission,
                message: 'submission approved successfully',
              });
            }
          }
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while approving submission',
          });
        }
      }
    );
    app.patch(
      '/reject-submission',
      verifyToken,
      verifyBuyer,
      async (req, res) => {
        try {
          const submission = await submissionCollection.findOneAndUpdate(
            { _id: new ObjectId(req.body.id) },
            {
              $set: {
                status: 'rejected',
              },
            },
            { returnDocument: 'after' }
          );
          if (submission.status === 'rejected') {
            const tasks = await tasksCollection.findOne({
              _id: new ObjectId(submission.task_id),
            });
            if (tasks) {
              const remainingWorkers = tasks.required_workers + 1;
              await tasksCollection.updateOne(
                { _id: new ObjectId(submission.task_id) },
                {
                  $set: {
                    required_workers: remainingWorkers,
                  },
                }
              );
              res.status(200).send({
                success: true,
                data: submission,
                message: 'submission rejected successfully',
              });
            }
          }
        } catch (error) {
          console.log(error);
          res.status(500).send({
            success: false,
            message: 'error while rejecting submission',
          });
        }
      }
    );
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
