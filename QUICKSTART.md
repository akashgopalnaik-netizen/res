# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas URI

## Installation (First Time)

```bash
# Install all dependencies
npm run install:all
```

## Start the Application

```bash
# Start all servers (backend + customer app + admin dashboard)
npm run dev
```

This will start:
- **Backend API**: http://localhost:5000
- **Customer App**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174

## Login Credentials

### Admin Dashboard
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodhub.com | admin123 |
| Manager | manager@foodhub.com | manager123 |
| Staff | staff@foodhub.com | staff123 |

### Customer App
| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | customer123 |

## Re-seed Database

If you need to reset the database:

```bash
cd server
npm run seed
```

## API Health Check

Visit http://localhost:5000/api/health to verify the backend is running.

## Features to Try

### Customer App (http://localhost:5173)
1. Browse the menu by category
2. Add items to cart
3. Create an account or login
4. Place an order (dine-in, takeout, or delivery)
5. Track your order in real-time
6. Make a table reservation

### Admin Dashboard (http://localhost:5174)
1. Login with admin credentials
2. View dashboard with live statistics
3. Manage orders (confirm, prepare, complete)
4. Check the Kitchen Display System
5. Add/edit menu items
6. Manage table assignments
7. View and confirm reservations
8. Track inventory and report wastage
9. Manage staff accounts
10. View revenue reports and analytics

## Troubleshooting

### MongoDB Connection Error
Make sure MongoDB is running:
```bash
# Windows (if MongoDB is installed as service)
net start MongoDB

# macOS (with Homebrew)
brew services start mongodb-community

# Or use MongoDB Atlas cloud database
```

### Port Already in Use
If a port is already in use, change it in the respective config:
- Backend: `server/.env` → `PORT`
- Client: `client/vite.config.js` → `server.port`
- Admin: `admin/vite.config.js` → `server.port`

### Stripe Payment Not Working
The app works in test mode. For real payments:
1. Get test keys from https://dashboard.stripe.com/test/apikeys
2. Update `server/.env` with your keys
3. Use test card: 4242 4242 4242 4242

## Next Steps

1. Customize the menu items in the database
2. Add your restaurant branding (logo, colors)
3. Configure real payment gateway credentials
4. Set up email/SMS notifications
5. Deploy to production (see README.md)
