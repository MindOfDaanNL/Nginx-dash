Nginx-Dash — Project Specification

1. Project Overview

Project name: Nginx-Dash
Project type: Self-hosted Nginx Management Dashboard
Backend: Node.js
Frontend: HTML, CSS, JavaScript
Database: MariaDB
Webserver: Nginx
SSL Management: Certbot (Let's Encrypt)
Authentication: Session-based authentication
Architecture: Web application + local Nginx management service

Description

Nginx-Dash is a modern, self-hosted web application designed to manage Nginx configurations from a central web interface.

The application allows administrators to create, edit, delete, enable and disable Nginx virtual host configurations without manually editing configuration files through SSH or a terminal.

It also provides integrated SSL certificate management through Certbot and Let's Encrypt.

The application uses MariaDB for user accounts, permissions, application settings, activity logs and other application data.

The system has two primary roles:

- Admin: Full access to Nginx management and application administration.
- Viewer: Read-only access to existing Nginx configurations.

The application must be fully functional. All management operations must execute against the actual Nginx installation.

---

2. Main Objectives

- Manage Nginx virtual hosts through a web interface.
- Create new Nginx configurations.
- Edit existing Nginx configurations.
- Delete configurations safely.
- Enable and disable individual configurations.
- Request SSL certificates through Certbot.
- Renew and manage existing SSL certificates.
- Manage application users through MariaDB.
- Implement role-based access control.
- Display Nginx service status.
- Validate configurations before applying changes.
- Keep an activity log of administrative operations.
- Provide a responsive and modern dashboard.

---

3. Technology Stack

Backend

- Node.js (latest stable LTS).
- Express.js.
- MariaDB.
- mysql2 for database connections.
- bcrypt for password hashing.
- express-session for session management.
- Helmet for HTTP security headers.
- Zod for input validation.

Frontend

- HTML5.
- CSS3.
- Vanilla JavaScript.
- Responsive design.
- Lucide icons.

System Integration

- Nginx.
- Certbot.
- Let's Encrypt.
- Linux system commands.
- systemd for service management.

Use maintained and production-ready dependencies. Avoid unnecessary frameworks and dependencies.

---

4. User Roles & Permissions

Nginx-Dash must implement strict role-based access control.

Viewer

Viewers have read-only access.

Permissions:

- View the dashboard.
- View all existing Nginx configurations.
- View domain names.
- View configuration status (enabled/disabled).
- View SSL certificate information.
- View certificate expiration dates.
- View Nginx service status.
- View configuration details.

Restrictions:

- Cannot create configurations.
- Cannot edit configurations.
- Cannot delete configurations.
- Cannot enable or disable configurations.
- Cannot request SSL certificates.
- Cannot renew certificates manually.
- Cannot manage users.
- Cannot modify application settings.

Admin

Administrators have full access.

Permissions:

- Everything available to Viewer.
- Create Nginx configurations.
- Edit Nginx configurations.
- Delete Nginx configurations.
- Enable and disable configurations.
- Request SSL certificates.
- Renew SSL certificates.
- Remove SSL certificates.
- View Certbot output and errors.
- Manage application users.
- Create new users.
- Edit user accounts.
- Change user roles.
- Disable and enable user accounts.
- Delete user accounts.
- View activity logs.
- Manage application settings.

Important: Permissions must be enforced server-side through middleware. Hiding buttons in the frontend is not sufficient.

---

5. Authentication & User Management

Implement a complete authentication system.

Login

- Username and password authentication.
- Secure password hashing using bcrypt.
- Session-based authentication.
- Secure session cookies.
- Session expiration.
- Logout functionality.
- Login rate limiting.
- Protection against brute-force attacks.
- CSRF protection for state-changing requests.

User Management

Administrators can:

- Create users.
- Assign Viewer or Admin roles.
- Change usernames.
- Reset passwords.
- Disable accounts.
- Delete accounts.
- View account creation dates.
- View last login.

Prevent administrators from accidentally deleting or disabling their own account if that would leave the application without an administrator.

Never store passwords in plaintext.

---

6. Dashboard

Create a professional overview dashboard.

Dashboard Statistics

Display:

- Total Nginx configurations.
- Enabled configurations.
- Disabled configurations.
- Active SSL certificates.
- Certificates expiring soon.
- Expired certificates.
- Nginx service status.

Dashboard Sections

Nginx Status

- Running / Stopped.
- Nginx version.
- Last successful reload.
- Configuration test status.

Configuration Overview

- Total configurations.
- Recently modified configurations.
- Recently created configurations.

SSL Overview

- Valid certificates.
- Certificates expiring within 30 days.
- Expired certificates.

Recent Activity

- Recently created configurations.
- Recently edited configurations.
- SSL certificate requests.
- Nginx reloads.

Viewer users must only see information they are permitted to access.

---

7. Nginx Configuration Management

This is one of the core features of Nginx-Dash.

Use the standard Nginx directory structure on Linux:

- "/etc/nginx/sites-available/"
- "/etc/nginx/sites-enabled/"

Allow the administrator to configure alternative paths through application settings.

Configuration List

Display all detected Nginx virtual host configurations.

Each configuration should show:

- Configuration name.
- Domain names.
- Configuration filename.
- Enabled / Disabled status.
- SSL enabled / disabled.
- Last modified date.
- Available actions.

Create Configuration

Administrators can create a new virtual host.

Form fields:

- Configuration name.
- Domain name(s).
- Listen port.
- Server type (HTTP / HTTPS).
- Document root.
- Proxy pass URL (optional).
- Custom configuration options.

Provide templates for common configurations:

1. Static website.
2. Node.js reverse proxy.
3. PHP website.
4. HTTP-only website.
5. HTTPS website.
6. Custom configuration.

Edit Configuration

Provide a configuration editor with:

- Syntax highlighting.
- Monospace font.
- Line numbers.
- Save functionality.
- Configuration validation.
- Error feedback.

The administrator must be able to edit the complete Nginx configuration.

Delete Configuration

- Require confirmation.
- Remove the configuration file.
- Remove its symlink from "sites-enabled" if present.
- Never delete unrelated files.
- Keep SSL certificate deletion separate from configuration deletion.

Enable / Disable Configuration

Enabling a configuration should create the appropriate symlink inside "sites-enabled".

Disabling a configuration should remove the corresponding symlink.

Always verify paths and prevent symlink traversal or arbitrary file access.

Nginx Configuration Validation

Before applying any configuration changes:

1. Create a backup of the current configuration.
2. Write the proposed configuration to a safe temporary file or staging location.
3. Validate the configuration using "nginx -t".
4. If validation fails, reject the changes.
5. Preserve the previous working configuration.
6. If validation succeeds, atomically apply the changes.
7. Reload Nginx.
8. If reload fails, restore the previous configuration and report the error.

Never reload Nginx with an invalid configuration.

---

8. SSL Certificate Management (Certbot)

Integrate Certbot directly into Nginx-Dash.

Use Let's Encrypt as the certificate authority.

Request SSL Certificate

Administrators can request SSL certificates through the dashboard.

Form fields:

- Domain name.
- Additional domain names (optional).
- Email address.
- Agree to Let's Encrypt terms.

The application should:

1. Verify that the domain configuration exists.
2. Verify that the domain points to the server where possible.
3. Verify that the required ports are reachable where possible.
4. Check that Certbot is installed.
5. Execute the appropriate Certbot command.
6. Capture command output.
7. Display progress and errors.
8. Update certificate information after successful issuance.

Use the Certbot Nginx integration where appropriate.

Example command:

"certbot --nginx -d example.com -d www.example.com"

SSL Certificate Overview

Display:

- Certificate name.
- Associated domains.
- Issued date.
- Expiration date.
- Certificate status.
- Certificate paths.
- Issuer.

Certificate Actions

Administrators can:

- Request certificates.
- Renew certificates.
- View certificate details.
- View renewal status.
- Remove certificates.

Automatic Renewal

Support Certbot's built-in systemd timer or cron-based renewal.

Do not implement a competing renewal scheduler if Certbot already manages automatic renewal.

Provide a way to check renewal status and run a renewal test using:

"certbot renew --dry-run"

Never expose private SSL keys through the dashboard.

---

9. Nginx Service Management

Administrators can manage the Nginx service.

Available actions:

- Check status.
- Start Nginx.
- Stop Nginx.
- Restart Nginx.
- Reload Nginx.
- Test configuration.

Display the command output and errors.

Use systemd where available.

Example commands:

- "systemctl status nginx"
- "systemctl start nginx"
- "systemctl stop nginx"
- "systemctl restart nginx"
- "systemctl reload nginx"
- "nginx -t"

Viewers can only see service status.

---

10. Activity Logging

Record important application and administrative actions.

Examples:

- User login.
- Failed login.
- User creation.
- Role changes.
- Configuration creation.
- Configuration modification.
- Configuration deletion.
- Configuration enable/disable.
- SSL certificate requests.
- SSL renewal.
- Nginx reload.
- Nginx restart.

Each log entry should contain:

- User ID.
- Username.
- Action.
- Description.
- Timestamp.
- IP address.
- Success / Failure.
- Relevant error information.

Administrators can browse and filter activity logs.

Never log passwords, session secrets or private SSL keys.

---

11. MariaDB Database Structure

Use MariaDB as the primary application database.

Create the following tables:

users

- id
- username
- email
- password_hash
- role
- is_active
- last_login
- created_at
- updated_at

settings

- id
- setting_key
- setting_value
- updated_at

activity_logs

- id
- user_id
- username
- action
- description
- ip_address
- status
- created_at

nginx_configurations

- id
- name
- filename
- domains
- enabled
- ssl_enabled
- created_by
- created_at
- updated_at

ssl_certificates

- id
- certificate_name
- domains
- issuer
- issued_at
- expires_at
- certificate_path
- status
- created_at
- updated_at

Important:

The actual Nginx configuration files and Certbot installation remain the source of truth for server state.

The database stores application metadata and cached information. Reconcile database records with the real system to prevent inconsistencies.

Use foreign keys where appropriate, indexes for frequently queried fields, prepared SQL statements and database migrations.

---

12. Application Settings

Create an administration settings page.

Configurable settings:

- Application name.
- Application URL.
- MariaDB connection settings.
- Nginx configuration directory.
- Nginx sites-available directory.
- Nginx sites-enabled directory.
- Nginx binary path.
- Certbot binary path.
- Default Let's Encrypt email.
- Default configuration template.
- Session timeout.

Sensitive settings must not be displayed in plaintext.

Store secrets securely and use environment variables for initial configuration.

---

13. User Interface & Design

Create a modern, professional dark-themed interface.

Design Direction

- Dark professional dashboard.
- Clean layout.
- Modern sidebar navigation.
- Compact information cards.
- Subtle borders and shadows.
- Smooth but restrained animations.
- Responsive design.
- Clear status indicators.
- Consistent spacing and typography.

Avoid generic AI-generated dashboard aesthetics.

Sidebar Navigation

- Dashboard
- Nginx Configurations
- SSL Certificates
- Activity Logs (Admin only)
- User Management (Admin only)
- Settings (Admin only)

Header

- Page title.
- Nginx service status.
- Notifications.
- Current username.
- Role indicator.
- Account menu.
- Logout.

Configuration Detail Page

Display:

- Domain information.
- Configuration status.
- SSL information.
- Configuration editor (Admin only).
- Enable/Disable actions (Admin only).
- Delete action (Admin only).

---

14. API Structure

Build a clean REST API.

Example endpoints:

Authentication

- "POST /api/auth/login"
- "POST /api/auth/logout"
- "GET /api/auth/me"

Dashboard

- "GET /api/dashboard/stats"
- "GET /api/dashboard/activity"

Nginx Configurations

- "GET /api/nginx/configs"
- "GET /api/nginx/configs/:id"
- "POST /api/nginx/configs"
- "PUT /api/nginx/configs/:id"
- "DELETE /api/nginx/configs/:id"
- "POST /api/nginx/configs/:id/enable"
- "POST /api/nginx/configs/:id/disable"
- "POST /api/nginx/test"
- "POST /api/nginx/reload"
- "GET /api/nginx/status"

SSL

- "GET /api/ssl/certificates"
- "GET /api/ssl/certificates/:id"
- "POST /api/ssl/request"
- "POST /api/ssl/renew"
- "DELETE /api/ssl/certificates/:id"
- "POST /api/ssl/renew-test"

Users (Admin only)

- "GET /api/users"
- "POST /api/users"
- "PUT /api/users/:id"
- "DELETE /api/users/:id"
- "POST /api/users/:id/reset-password"

Activity Logs (Admin only)

- "GET /api/logs"
- "GET /api/logs/:id"

All endpoints must validate input, enforce permissions and return consistent JSON responses.

---

15. Security Requirements

Security is a critical requirement because Nginx-Dash can execute privileged server operations.

Implement:

- Strict role-based access control.
- Password hashing with bcrypt.
- Secure session handling.
- CSRF protection.
- XSS protection.
- SQL injection prevention.
- Rate limiting.
- Secure HTTP headers.
- Input validation.
- File path validation.
- Command execution protection.
- Audit logging.
- Secure error handling.

Privileged System Operations

The Node.js application must never run as root.

Implement a separate, restricted system integration layer or helper service for privileged Nginx and Certbot operations.

Requirements:

- Allow only explicitly defined operations.
- Use fixed executable paths.
- Never pass arbitrary user input to a shell.
- Use argument arrays instead of shell command strings.
- Restrict filesystem access to approved Nginx directories.
- Validate domain names and filenames.
- Never expose arbitrary command execution through an API.
- Protect against symlink attacks and path traversal.
- Apply timeouts to external commands.
- Limit command output size.
- Keep an audit trail of privileged operations.

The helper service should have the minimum Linux permissions necessary to perform its tasks.

Do not provide a general-purpose terminal or shell interface in the dashboard.

---

16. Installation & Deployment

Target environment:

- Ubuntu Server.
- Node.js LTS.
- MariaDB.
- Nginx.
- Certbot.
- systemd.
- PM2 or systemd for Node.js process management.

Provide an installation guide.

The installation process should include:

1. Install required packages.
2. Create the MariaDB database.
3. Create a restricted database user.
4. Configure environment variables.
5. Install Node.js dependencies.
6. Run database migrations.
7. Configure the restricted privileged helper.
8. Create the initial administrator account securely.
9. Configure the application service.
10. Configure the Nginx reverse proxy.
11. Start Nginx-Dash.

Include:

- ".env.example"
- Database migrations.
- Installation script.
- Update instructions.
- Backup instructions.
- Troubleshooting documentation.
- Uninstallation instructions.

Never hardcode database passwords or administrator credentials.

---

17. Suggested Project Structure

nginx-dash/
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   ├── session.js
│   │   └── environment.js
│   │
│   ├── middleware/
│   │   ├── authentication.js
│   │   ├── authorization.js
│   │   ├── csrf.js
│   │   └── errorHandler.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── nginx/
│   │   ├── ssl/
│   │   ├── users/
│   │   ├── settings/
│   │   └── activity/
│   │
│   ├── services/
│   │   ├── nginxService.js
│   │   ├── certbotService.js
│   │   ├── systemService.js
│   │   └── activityService.js
│   │
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── utils/
│   │
│   └── views/
│       ├── layouts/
│       ├── pages/
│       └── partials/
│
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── assets/
│
├── nginx-helper/
│   └── (restricted privileged integration)
│
├── scripts/
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── PROJECT.md

The structure can evolve as the project grows, provided the separation of concerns is maintained.

---

18. Development Phases

Phase 1 — Foundation

- Initialize Node.js project.
- Configure Express.
- Configure MariaDB.
- Implement database migrations.
- Implement authentication.
- Implement Viewer/Admin roles.
- Create the dashboard layout.
- Implement session management.

Phase 2 — Nginx Management

- Detect existing Nginx configurations.
- Display configuration list.
- Implement configuration details.
- Create configuration templates.
- Implement configuration editor.
- Implement configuration validation.
- Implement enable/disable functionality.
- Implement safe deletion.
- Implement backup and rollback.

Phase 3 — SSL Management

- Integrate Certbot.
- Detect installed certificates.
- Request SSL certificates.
- Display expiration dates.
- Implement renewal operations.
- Implement renewal testing.
- Display Certbot errors and output.

Phase 4 — System Management

- Nginx service status.
- Start/stop/restart/reload operations.
- Nginx configuration testing.
- Restricted privileged helper.
- System operation logging.

Phase 5 — Administration

- User management.
- Activity logs.
- Application settings.
- Security improvements.
- Database backup and recovery.

Phase 6 — Testing & Release

- Authentication tests.
- Permission tests.
- API tests.
- Nginx configuration tests.
- Certbot integration tests.
- Security tests.
- Installation testing on a clean Ubuntu server.
- Documentation.
- Production deployment.

---

19. Testing Requirements

Create automated tests for:

- Login and logout.
- Password hashing.
- Session expiration.
- Viewer permissions.
- Admin permissions.
- Unauthorized API access.
- Configuration creation.
- Configuration editing.
- Configuration validation.
- Configuration rollback.
- Configuration enabling/disabling.
- SSL certificate requests.
- Certbot failures.
- Activity logging.

Use a test environment with temporary Nginx configurations.

Never run destructive integration tests against a production Nginx installation.

---

20. Important Development Rules

1. Build a fully working application, not a frontend prototype.
2. Do not use mock data for features that should communicate with the actual server.
3. Keep backend, frontend and system integration logically separated.
4. Follow modern Node.js development practices.
5. Use MariaDB for persistent application data.
6. Use database migrations instead of manually creating tables.
7. Enforce permissions on every protected backend endpoint.
8. Never run the Node.js application as root.
9. Never execute arbitrary shell commands from user input.
10. Always validate Nginx configurations before applying them.
11. Always maintain backups before modifying configuration files.
12. Provide clear error messages.
13. Log important administrative actions.
14. Keep the interface responsive and professional.
Write maintainable, documented code.
Do not leave unfinished buttons or placeholder functionality.
Keep dependencies updated and avoid deprecated packages.

---

21. Final Product Vision
Nginx-Dash should become a complete and reliable Nginx management platform.
An administrator should be able to manage multiple websites and reverse proxies, configure domains, manage SSL certificates and monitor the Nginx service without needing to manually edit configuration files.
A Viewer should be able to log in and inspect all existing configurations without having the ability to change anything.
The final product must be secure, stable, maintainable and suitable for real-world production use.
Priority: Functionality, security and reliability first. Visual design second.