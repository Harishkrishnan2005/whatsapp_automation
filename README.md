# 🤖 WhatsApp Chatbot SaaS Platform

> A production-level, multi-tenant SaaS platform for WhatsApp-style chatbot automation with dynamic flow engine, subscription plans, and template system.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-16%2B-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-4.4%2B-green.svg)

---

## 🎯 Features

### Core Platform
- ✅ **Multi-tenant Architecture** - Complete data isolation per business
- ✅ **Subscription Plans** - FREE, BASIC, PRO, ENTERPRISE with feature gating
- ✅ **Dynamic Chatbot Engine** - DB-driven flows, no hardcoded responses
- ✅ **Plan-Based UI** - UI adapts to user's subscription tier
- ✅ **Template System** - Pre-made flows that auto-create in database
- ✅ **Session Management** - Conversation memory & form data collection
- ✅ **Action Engine** - Extensible handlers for complex workflows

### Business Features
- 📅 **Booking System** - Appointment scheduling with available slots
- 🛍️ **E-commerce** - Product catalog, cart, orders, payments
- 🆘 **Support Tickets** - Customer issue tracking
- ⭐ **Feedback System** - Review collection with ratings
- 📊 **Analytics** - Revenue, MRR, customer insights
- 👥 **CRM** - Customer management with chat history
- 📱 **Chat Management** - Staff assignment & human handoff

---

## 🏗️ System Architecture

### Tech Stack

**Frontend:**
- React.js 18+
- Tailwind CSS
- React Router
- Context API

**Backend:**
- Node.js 16+
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Razorpay Integration

**Database:**
- MongoDB (Multi-tenant)
- Collections: 24+ models
- Indexes for performance

---

## 📚 Plan Tiers

### 🟢 FREE - Starter Layer
- **Max Flows:** 1 | **Max Messages:** 100/month
- **Mode:** Starter | **Price:** Free
- **Features:** Basic lead capture bot, no customization
- **UI:** Hidden flow count, simple interface

### 🔵 BASIC - Template Layer
- **Max Flows:** 5 | **Max Messages:** 1,000/month
- **Mode:** Template | **Price:** ₹999/month
- **Features:** Select templates, customize messages
- **UI:** Template selector, edit messages
- **Templates:** Booking, E-commerce

### 🟡 PRO - Smart Custom Layer
- **Max Flows:** 15 | **Max Messages:** 10,000/month
- **Mode:** Smart | **Price:** ₹2,499/month
- **Features:** Custom flows, conditional logic, support, feedback
- **UI:** Flow builder, conditional logic UI
- **Templates:** All + Support, Feedback

### 🔴 ENTERPRISE - Advanced Layer
- **Max Flows:** Unlimited | **Max Messages:** Unlimited
- **Mode:** Advanced | **Price:** ₹4,999/month
- **Features:** Full control, API access, webhooks
- **UI:** Complete access to all features
- **Templates:** All available

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chatbot-saas.git
cd chatbot-saas
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
```

4. **Set up environment variables**

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chatbot-saas
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

5. **Start the backend**
```bash
cd backend
npm run dev
```

6. **Start the frontend**
```bash
cd frontend
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

---

## 🤖 Chatbot Engine Flow

### How It Works

```
1. USER SENDS MESSAGE
   ↓
2. LOAD/CREATE SESSION
   ├─ Find session by (businessId, phone)
   └─ Create if doesn't exist
   ↓
3. CHECK RESET KEYWORDS (hi, hello, start, menu, restart)
   ├─ Yes → Reset session to START
   └─ No → Continue
   ↓
4. FIND MATCHING FLOW
   ├─ Exact trigger match in current step
   ├─ Wildcard (*) trigger in current step
   └─ Keyword partial match
   ↓
5. EXECUTE ACTION
   ├─ JUST_SEND_REPLY
   ├─ SAVE_* (collect user data)
   ├─ SHOW_PRODUCTS
   ├─ CREATE_ORDER / CREATE_BOOKING
   └─ Custom actions
   ↓
6. UPDATE SESSION STATE
   ├─ session.currentStep = nextStep
   ├─ session.collectedData = updated
   └─ Save to DB
   ↓
7. RETURN RESPONSE
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | Complete system architecture & how it works |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | All API endpoints with examples |
| [Flow Architecture](./docs/architecture.md) | System design & data flow |
| [Database Schema](./docs/database.md) | Collections & relationships |

---

## 🎨 Frontend Components

### Available Components

```jsx
// Feature Gating
<FeatureGate feature="customization" businessPlan={userPlan}>
  <FlowBuilder />
</FeatureGate>

// Template Selection
<TemplateSelector
  businessId={businessId}
  onTemplateApplied={handleApplied}
/>

// Plan-Aware Dashboard
<PlanAwareDashboard />

// Chat Simulator
<ChatSimulator businessId={businessId} />
```

---

## 🧪 Testing

### Test Template Application
```bash
curl -X POST http://localhost:5000/api/templates/booking/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"category": "booking"}'
```

### Test Chat Simulator
```bash
curl -X POST http://localhost:5000/api/chat/simulate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "...",
    "phone": "+1234567890",
    "message": "hi"
  }'
```

### Get Available Templates
```bash
curl http://localhost:5000/api/templates \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Database Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| businesses | Multi-tenant isolation | name, subscription.plan, businessId |
| chatbot_flows | Bot logic | businessId, step, trigger, nextStep |
| chat_sessions | Conversation state | businessId, phone, currentStep |
| customers | Customer data | businessId, phone, name |
| templates | Flow templates | name, flows, minPlan |
| orders | E-commerce | businessId, customerId, total |
| appointments | Bookings | businessId, customerId, date |

---

## 🔐 Security

- JWT Authentication with token validation
- Role-based Access Control (RBAC)
- Multi-tenant data isolation (businessId verification)
- Request validation middleware
- Rate limiting on all endpoints
- Encrypted sensitive data
- CORS protection

---

## 🛠️ Development

### Project Structure

```
backend/
├── config/               # Configuration
├── controllers/          # Request handlers
├── models/              # Mongoose schemas
├── services/            # Business logic
├── routes/              # API routes
├── middlewares/         # Express middleware
├── scripts/             # Helper scripts
└── utils/               # Utilities

frontend/
├── src/
│  ├── components/       # React components
│  ├── pages/            # Page components
│  ├── context/          # Context providers
│  ├── services/         # API calls
│  └── styles/           # CSS files
```

---

## 📈 Key Endpoints

**Templates**
- `GET /api/templates` - List available templates
- `POST /api/templates/:name/apply` - Apply template

**Chatbot**
- `POST /api/chat/simulate` - Test chatbot
- `GET /api/chatbot/flows` - List flows
- `POST /api/chatbot/flows` - Create flow

**Dashboard**
- `GET /api/dashboard/stats` - Dashboard stats

**Customers**
- `GET /api/customers` - List customers
- `GET /api/customers/:id/messages` - Get messages

---

## 🚀 Deployment

### Environment Variables Required

```env
# Backend
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Frontend
VITE_API_URL=http://localhost:5000/api
```

### Deploy to Heroku

```bash
# Build frontend
cd frontend && npm run build

# Deploy
git push heroku main
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

---

## 📝 License

MIT License - see LICENSE file

---

## 🆘 Support

- 📖 Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- 📚 Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 💬 Discord: [Join Community](https://discord.gg/...)
- 📧 Email: support@chatbotsaas.com

---

**Made with ❤️ for developers and businesses**

⭐ Star us if you find this helpful!
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