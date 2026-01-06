# Test: Dynamic Content Loading

## Description
Test waiting for and verifying dynamically loaded content.

## Steps

1. Go to https://the-internet.herokuapp.com/dynamic_loading/1
2. Verify "Hello World" text is NOT visible initially
3. Click the Start button
4. Wait for the loading indicator to disappear
5. Verify "Hello World!" text appears after loading completes and
6. Take a screenshot of the final state

## Expected Outcome
- Start button triggers dynamic loading
- Loading bar appears and then disappears
- "Hello World!" text appears after loading
- Content is not visible before loading completes
- System properly waits for dynamic content
