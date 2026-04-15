# WhatsApp Automation Demo Platform

A complete MERN stack demo for WhatsApp automation simulation with **role-based admin and staff management**.

## Features

### Core Features
- Simulated WhatsApp chatbot with menu-based responses
- CRM for customer management
- Order management system
- Marketing campaigns
- Analytics dashboard
- JWT authentication with roles

### Admin Features
- ✅ Staff Management (create, edit, delete, assign permissions)
- ✅ Chatbot Control (create flows, edit menu, manage rules)
- ✅ Chat Management (monitor, assign to staff, take over)
- ✅ Appointment/Booking Management
- ✅ Advanced Analytics (conversion rates, customer engagement, revenue)
- ✅ Campaign Performance Tracking
- ✅ User & Permission Management

### Staff Features
- ✅ Assigned Chat Handling (view, reply, close)
- ✅ Quick Replies (pre-made responses)
- ✅ Customer Information (limited access)
- ✅ Booking Management
- ✅ Real-time Notifications
- ✅ Limited Order Management

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React.js, Vite, Tailwind CSS, Axios, Context API
- **Authentication**: JWT
- **Authorization**: Role-based Access Control (RBAC)

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update `.env` file:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/whatsapp_demo
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

4. Start MongoDB and run backend:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### Default Credentials

```
Admin Account:
  Email: admin@test.com
  Password: admin123

(Create staff accounts via admin dashboard)
```

## User Roles

### Admin
- Full platform control
- Can create and manage staff
- Monitor all chats
- View advanced analytics
- Manage chatbot flows
- Manage appointments

### Staff
- Handle assigned customer chats
- View limited customer information
- Use quick replies
- Manage assigned bookings
- Respond to notifications

## Project Structure

```
whatsapp-automation/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middlewares/
│   ├── utils/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── admin/          (Admin pages)
│   │   │   ├── staff/          (Staff pages)
│   │   │   └── ...
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── ADMIN_STAFF_FEATURES.md
```

## Key Pages

### Common Pages
- Dashboard (basic analytics)
- Chat Simulator (webhook testing)
- Customers (list & manage)
- Orders (list & manage)
- Campaigns (create & send)
- Analytics (basic metrics)

### Admin Pages
- Staff Management (`/admin/staff`)
- Chatbot Control (`/admin/chatbot`)
- Chat Management (`/admin/chat-management`)
- Appointment Management (`/admin/appointments`)
- Advanced Analytics (`/admin/advanced-analytics`)

### Staff Pages
- My Chats (`/staff/chat`)
- My Bookings (`/staff/bookings`)

## API Endpoints

See [ADMIN_STAFF_FEATURES.md](./ADMIN_STAFF_FEATURES.md) for complete API documentation.

### Quick Examples

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

**Webhook (Send Customer Message):**
```bash
curl -X POST http://localhost:5000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","message":"Hi"}'
```

**Get Customers (Protected):**
```bash
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Features Demo

### Admin Workflow
1. Login as admin
2. Create staff accounts
3. Design chatbot flows
4. Monitor live chats
5. Assign chats to staff
6. View advanced analytics
7. Manage appointments

### Staff Workflow
1. Login as staff
2. See assigned chats
3. Respond using quick replies
4. Manage customer bookings
5. Receive notifications
6. Close chats when done

## Notifications

- **New Message Alert**: Assigned staff gets notified
- **New Order Alert**: Admin notified
- **Assignment Alert**: Staff notified of chat assignments
- **Appointment Alert**: Status updates sent
- **Real-time Updates**: Polls every 5 seconds

## Database Models

- User (with roles & permissions)
- Customer
- Message
- Order
- Campaign
- Appointment
- ChatAssignment
- ChatbotFlow
- QuickReply
- Notification

## Notes

- This is a demo system for business workflow showcasing
- Chatbot uses rule-based logic (not AI/ML)
- Real WhatsApp API integration not included (simulated via webhook)
- Pagination implemented for large datasets
- Role-based access control on all protected routes
- JWT tokens expire after 24 hours

## Support & Documentation

For detailed admin/staff features, permissions, and workflows:
See [ADMIN_STAFF_FEATURES.md](./ADMIN_STAFF_FEATURES.md)