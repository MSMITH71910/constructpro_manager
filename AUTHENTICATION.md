# ConstructPro Manager - Authentication System

## Overview

The ConstructPro Manager now includes a comprehensive user authentication system with registration, login, and user management capabilities.

## Features

### User Registration
- **Full Profile Creation**: First name, last name, username, email, company, and role
- **Role-Based Access**: Support for different construction industry roles:
  - General Contractor
  - Subcontractor  
  - Architect
  - Engineer
  - Project Manager
  - Estimator
  - Other
- **Real-time Validation**: Username uniqueness, email validation, password strength
- **Terms & Conditions**: Agreement checkbox before registration

### User Login
- **Flexible Login**: Users can log in with either username or email
- **Remember Me**: Optional 30-day session persistence
- **Password Visibility Toggle**: Show/hide password functionality
- **Demo Account**: Built-in demo user for testing

### Session Management
- **Secure Sessions**: Time-based session expiration
- **Auto-logout**: Sessions expire after 8 hours (or 30 days if "Remember Me" is checked)
- **Session Restoration**: Automatic login on page reload if session is valid

### User-Specific Data
- **Data Isolation**: Each user's projects, clients, estimates, etc. are stored separately
- **Profile Management**: User profile and company settings (coming soon)
- **Role-Based Permissions**: Different access levels based on user role

## Demo Account

For testing purposes, a demo account is automatically created:
- **Username**: `demo`
- **Password**: `demo123`

## Usage

### 1. Starting the Application

Open `index.html` in a web browser. The authentication screen will appear automatically.

### 2. Registration

1. Click the "Register" tab
2. Fill in all required fields:
   - First Name
   - Last Name
   - Username (3-20 characters, letters/numbers/underscores only)
   - Email Address
   - Company Name
   - Your Role (select from dropdown)
   - Password (minimum 6 characters)
   - Confirm Password
3. Check the "Terms of Service" agreement
4. Click "Create Account"

### 3. Login

1. On the "Sign In" tab, enter:
   - Username or Email
   - Password
2. Optional: Check "Remember me for 30 days"
3. Click "Sign In"

### 4. Using the Application

Once logged in:
- The main navigation becomes visible
- User dropdown appears in the top-right corner
- All data (projects, clients, estimates, etc.) is user-specific
- Use the user dropdown to access profile settings or sign out

## Testing

A test page is available at `test-auth.html` which demonstrates:
- Authentication flow
- Session management
- User interface updates
- Demo account functionality

## Technical Implementation

### Files Added
- `src/renderer/modules/AuthManager.js` - Main authentication logic
- `src/renderer/styles.css` - Authentication UI styles (added)
- `test-auth.html` - Standalone authentication test

### Files Modified
- `src/renderer/index.html` - Added AuthManager script, hidden navigation initially
- `src/renderer/app.js` - Integrated authentication flow, user management
- `src/renderer/modules/DataManager.js` - User-specific data storage

### Data Storage
- User accounts stored in `localStorage` with key `constructpro_users`
- Active session stored in `localStorage` with key `constructpro_session`  
- User data stored with user-specific keys: `constructpro_{userId}_{dataType}`

### Security Features
- Password hashing (simple hash for demo - use bcrypt in production)
- Session expiration
- Input validation and sanitization
- CSRF protection ready (for production API integration)

## Production Considerations

For production deployment:

1. **Replace localStorage with proper backend**:
   - User authentication API
   - Database storage for user accounts
   - JWT tokens instead of localStorage sessions

2. **Enhance Security**:
   - Use bcrypt or similar for password hashing
   - Implement proper CSRF protection
   - Add rate limiting for login attempts
   - Use HTTPS only

3. **Add Email Verification**:
   - Email confirmation for registration
   - Password reset functionality
   - Email notifications for security events

4. **Implement Advanced Features**:
   - Multi-factor authentication (2FA)
   - Single Sign-On (SSO) integration
   - Role-based access control (RBAC)
   - User management dashboard for admins

## API Integration

The system is designed to easily integrate with backend APIs. Key integration points:

- `AuthManager.handleLogin()` - Add API authentication call
- `AuthManager.handleRegister()` - Add API user creation call  
- `DataManager.loadData()` - Already includes API-first approach
- Session management can be enhanced with JWT tokens

## Troubleshooting

### Common Issues

1. **"User not authenticated" on page load**:
   - Clear browser localStorage
   - Try demo account: username `demo`, password `demo123`

2. **Navigation not showing after login**:
   - Check browser console for JavaScript errors
   - Ensure all script files are loaded correctly

3. **Registration fails**:
   - Check that all fields are filled
   - Ensure username is unique
   - Verify password meets requirements

4. **Data not persisting between sessions**:
   - Check that "Remember me" is checked for longer sessions
   - Verify localStorage is enabled in browser

### Browser Support
- Chrome 80+
- Firefox 75+  
- Safari 13+
- Edge 80+

## Future Enhancements

- Social login integration (Google, Microsoft, etc.)
- User profile picture upload
- Company branding/theming
- Advanced permission system
- User activity logging
- Password strength indicator
- Account recovery options