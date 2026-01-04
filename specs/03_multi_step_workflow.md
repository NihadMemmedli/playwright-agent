# Test: Multi-Step Authentication Workflow

## Description
Test a complete authentication workflow including login and logout.

## Steps

1. Go to https://the-internet.herokuapp.com
2. Click "Form Authentication" link
3. Verify we are on the login page
4. Enter username "tomsmith"
5. Enter password "SuperSecretPassword!"
6. Click Login button
7. Verify secure page loads
8. Verify "Welcome to the Secure Area" message is shown
9. Click Logout button
10. Verify we are back on the login page
11. Verify login form is visible again

## Expected Outcome
- Navigation between pages works correctly
- Login succeeds with valid credentials
- Secure area is accessible after login
- Logout works correctly
- User returns to login page after logout
