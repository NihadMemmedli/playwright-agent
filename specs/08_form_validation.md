# Test: Form Validation Error Handling

## Description
Test form validation by submitting invalid data and verifying error messages.

## Steps

1. Navigate to https://the-internet.herokuapp.com/login
2. Verify the login form is visible
3. Leave both username and password fields empty
4. Click the Login button
5. Verify an error message appears (check for any error text)
6. Enter only the username "tomsmith" (leave password empty)
7. Click the Login button again
8. Verify an error message still appears
9. Enter correct username "tomsmith" and wrong password "wrongpassword"
10. Click the Login button
11. Verify the error message indicates invalid password
12. Take a screenshot of the error state

## Expected Outcome
- Form properly validates empty fields
- Error messages are displayed for invalid input
- Partial validation works (username only)
- Wrong password generates appropriate error
- All validation states are captured
