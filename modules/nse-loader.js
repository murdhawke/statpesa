const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise'); // Assuming you're using mysql2 for database operations
const fs = require('fs');

const rawData = fs.readFileSync('../config/config.json');
const config = JSON.parse(rawData);

async function scrapeNSE() {
    let browser;
    try {
        // Launch the browser
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome', // Update this path if necessary
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto('https://afx.kwayisi.org/nse/', { waitUntil: 'networkidle2' });

        // Scrape the data from the table
        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.t table tbody tr'));
            return rows.map(row => {
                const cols = Array.from(row.querySelectorAll('td'));
                return {
                    ticker: cols[0].innerText.trim(),
                    name: cols[1].innerText.trim(),
                    volume: parseInt(cols[2].innerText.replace(/,/g, '') || '0'), // Convert to integer
                    price: parseFloat(cols[3].innerText.replace(/[^0-9.-]+/g, '')), // Convert to float
                    variance: parseFloat(cols[4].innerText.replace(/[^0-9.-]+/g, '') || '0') // Convert to float
                };
            });
        });

        console.log(data); // Log the scraped data for debugging

        // Store the data in the database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: config.db_username,
            password: config.db_password,
            database: 'statpesa'
        });

        // Insert the data into the nse_stocks table
        const queries = data.map(item => {
            return connection.query(
                'INSERT INTO nse_stocks (ticker, name, volume, price, variance) VALUES (?, ?, ?, ?, ?)',
                [item.ticker, item.name, item.volume, item.price, item.variance]
            );
        });

        await Promise.all(queries);
        console.log('Data has been successfully saved to the database!');

        await connection.end(); // Close the database connection
    } catch (error) {
        console.error('Error occurred during scraping or saving data:', error);
    } finally {
        if (browser) {
            await browser.close(); // Ensure the browser is closed in case of error
        }
    }
}

// Call the async function
scrapeNSE();    
