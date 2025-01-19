# PayTasker

**PayTasker** is a task management system that allows workers and buyers to manage tasks, payments, and notifications efficiently. Workers can complete tasks and earn coins, while buyers can approve or reject task submissions and manage payments.

## Features

- **Task Management**: Buyers can create tasks, approve or reject submissions.
- **Worker Rewards**: Workers are rewarded with coins for completing tasks.
- **Payment System**: Buyers can approve or reject payments based on task completion.
- **Notifications**: Users receive real-time updates on task status and payment approvals.

## Technologies Used

- **Node.js**: JavaScript runtime for the server.
- **Express.js**: Web framework for building APIs.
- **MongoDB**: NoSQL database for storing task and user data.
- **JWT**: For secure authentication and authorization.
- **Stripe**: Payment processing.
- **CORS**: For handling cross-origin requests.
- **Nodemon**: For automatic server restarts during development.

## API Routes

## 1. **GET /best-workers**

- **Description**: Fetches the top 6 workers based on the highest number of coins.

## 2. **GET /buyer-states**

- **Description**: Fetches the buyer's task and payment data, including total tasks, pending tasks, and total payment made.

## 3. **PATCH /approve-submission**

- **Description**: Approves a worker's task submission and rewards them with coins for the task completion.

## 4. **PATCH /reject-submission**

- **Description**: Rejects a worker's task submission and reassigns the task to other workers.

## 5. **GET /worker-states**

- **Description**: Fetches the worker's task submission and payment data, including total submissions, pending submissions, and total earnings.

## 6. **GET /notifications**

- **Description**: Fetches notifications for the authenticated user based on their email.

## 7. **POST /create-task**

- **Description**: Creates a new task for a buyer, specifying task details like required workers and task title.

## 8. **GET /task-details**

- **Description**: Fetches the details of a specific task using its ID.

## 9. **POST /submit-task**

- **Description**: Allows workers to submit completed tasks for review.

## 10. **GET /all-tasks**

- **Description**: Fetches all tasks for the authenticated buyer or worker, based on their role.

## 11. **PATCH /update-task**

- **Description**: Updates the details of an existing task.

## 12. **POST /create-submission**

- **Description**: Submits a worker's task submission for review by the buyer.

## 13. **GET /submissions**

- **Description**: Fetches a list of all submissions for a particular task.

## 14. **GET /task-status**

- **Description**: Fetches the current status of a task (e.g., pending, completed, approved).

## 15. **PATCH /update-task-status**

- **Description**: Updates the status of a task (e.g., from pending to completed).

## 16. **POST /payment**

- **Description**: Processes a payment to the worker for completing the task, integrating with Stripe.

## 17. **GET /payment-status**

- **Description**: Fetches the status of a payment made to a worker.

## 18. **GET /user-profile**

- **Description**: Fetches the authenticated user's profile details (either worker or buyer).

## 19. **PATCH /update-profile**

- **Description**: Updates the authenticated user's profile details.

## 20. **POST /register**

- **Description**: Registers a new user (either buyer or worker) and stores their details.

## 21. **POST /login**

- **Description**: Logs in a user by validating their credentials and generating a JWT token.

## 22. **GET /user-wallet**

- **Description**: Fetches the authenticated worker's wallet balance (coins).

## 23. **PATCH /add-coins**

- **Description**: Adds coins to a worker's wallet after a successful task completion or payment.

## 24. **GET /task-history**

- **Description**: Fetches the history of tasks for the authenticated buyer or worker.

## 25. **GET /worker-rankings**

- **Description**: Fetches rankings of workers based on completed tasks and coins earned.

## 26. **POST /submit-feedback**

- **Description**: Allows buyers to submit feedback on a worker's performance after task completion.

## 27. **GET /feedback**

- **Description**: Fetches all feedback submitted for a particular worker or buyer.

## 28. **GET /search-tasks**

- **Description**: Allows searching for tasks based on specific filters like task title, category, or status.

## 29. **GET /task-analytics**

- **Description**: Fetches analytics for a task, such as the number of workers assigned, submission status, and payment details.

## 30. **POST /generate-report**

- **Description**: Generates a report for the buyer on the status of all their tasks and payments.

## 31. **GET /payment-history**

- **Description**: Fetches the payment history for the authenticated buyer or worker.

## 32. **POST /notification-settings**

- **Description**: Allows users to customize their notification preferences for task and payment updates.

## 33. **GET /admin-dashboard**

- **Description**: Fetches the admin dashboard data, including the number of tasks, submissions, payments, and users.

## 34. **PATCH /approve-user**

- **Description**: Approves a new user registration as a buyer or worker by the admin.

## 35. **POST /send-notification**

- **Description**: Sends a notification to a user based on specific criteria (e.g., task completion, submission status).
