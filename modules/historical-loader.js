const fs = require('fs');
const mysql = require('mysql2/promise');
const csv = require('csv-parser');
const rawData = fs.readFileSync('../config/config.json');
const config = JSON.parse(rawData);

// Database configuration
const dbConfig = {
    host: 'localhost', // Your database host
    user: config.db_username, // Your database username
    password: config.db_password, // Your database password
    database: 'statpesa' // Your database name
};

// Function to parse and normalize date formats
function parseDate(dateStr) {
    if (!dateStr) return null; // Return null if the date is undefined or empty

    const ddmmyyyyPattern = /(\d{2})\/(\d{2})\/(\d{4})/; // Matches dd/mm/yyyy
    const yyyyddmmPattern = /(\d{4})\/(\d{2})\/(\d{2})/; // Matches yyyy/dd/mm

    let match;

    if ((match = dateStr.match(ddmmyyyyPattern))) {
        // dd/mm/yyyy format
        const day = match[1];
        const month = match[2];
        const year = match[3];
        return `${year}-${month}-${day}`; // Convert to yyyy-mm-dd
    } else if ((match = dateStr.match(yyyyddmmPattern))) {
        // yyyy/dd/mm format
        const year = match[1];
        const month = match[3];
        const day = match[2];
        return `${year}-${month}-${day}`; // Convert to yyyy-mm-dd
    }

    // If the date format is not recognized, return null
    console.warn(`Unrecognized date format: ${dateStr}`);
    return null;
}

// Function to load CSV data into the database
async function loadCsvToDatabase(csvFilePath) {
    const connection = await mysql.createConnection(dbConfig);

    const queries = [];
    
    // Read the CSV file
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            console.log('Row data:', row); // Log row data for debugging

            const date = row.date; // Use the correct header name
            const currency = row.currency; // Use the correct header name
            const mean = row.mean; // Use the correct header name
            const buy = row.buy; // Use the correct header name
            const sell = row.sell; // Use the correct header name

            // Format the date using the parseDate function
            const formattedDate = parseDate(date);

            // Ensure the fields are present and valid
            if (formattedDate && currency && mean && buy && sell) {
                const query = connection.query(
                    'INSERT INTO exchange_rates (date, currency, mean, buy, sell) VALUES (?, ?, ?, ?, ?)',
                    [formattedDate, currency, parseFloat(mean), parseFloat(buy), parseFloat(sell)]
                );
                queries.push(query);
            } else {
                console.warn('Skipping row due to missing or invalid data:', row);
            }
        })
        .on('end', async () => {
            try {
                // Execute all queries
                await Promise.all(queries);
                console.log('Data loaded successfully!'); // Log success message
            } catch (error) {
                console.error('Error inserting data:', error);
            } finally {
                await connection.end(); // Close the database connection
                process.exit(0); // End the process
            }
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            process.exit(1); // End the process with an error code
        });
}

// Call the function with your CSV file path
const csvFilePath = './historical.csv'; // Update with your CSV file path
loadCsvToDatabase(csvFilePath);
