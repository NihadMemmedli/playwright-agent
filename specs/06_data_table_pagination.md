# Test: Data Table Pagination

## Description
Test pagination functionality on a data table with multiple pages.

## Steps

1. Navigate to https://the-internet.herokuapp.com/tables
2. Verify the table is visible on the page
3. Count the number of rows in the table (should be a small number)
4. Click the "Next" pagination button or link
5. Wait for the table to refresh with new data
6. Verify different data is displayed (not the same as page 1)
7. Click "Previous" to go back
8. Verify original data is displayed again
9. Take a screenshot of the final table state

## Expected Outcome
- Pagination controls work correctly
- Table data changes between pages
- Can navigate forward and backward
- Table refreshes properly with new data
