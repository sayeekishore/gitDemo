const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function readIPsFromFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('ip.txt', 'utf8', (err, data) => {
            if (err) {
                reject('Error reading IP addresses from file: ' + err);
            } else {
                const ips = data.trim().split(/[\n,]+/);
                resolve(ips);
            }
        });
    });
}

// Check if Certificate is Uploaded & Reboot device using .sh script
function rebootViaSSH(ip) {
    return new Promise((resolve, reject) => {
        exec(`sh ./UpdateCertificate.sh ${ip}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`SSH reboot error: ${error.message}`);
                reject(error);
            } else {
                console.log(`SSH stdout: ${stdout}`);
                resolve(stdout);  
            }
        });
    });
}

async function openUrlWithIP() {
    try {
        const ipAddresses = await readIPsFromFile();
        console.log(`IP Addresses from file:`, ipAddresses);

        for (const ipAddress of ipAddresses) {
            options.addArguments('--headless'); 
            let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

            try {
                const username = ''; 
                const password = 'password'; 
                const url = `http://${username}:${password}@${ipAddress}`;

                console.log('Opening URL:', url);
                await driver.get(url);
                await sleep(1000); 
                await driver.manage().window().maximize();

                console.log('Device Loaded:', ipAddress);

                const browserTab = await driver.wait(
                    until.elementLocated(By.xpath('//*[@id="mainMenu"]/ul/li[4]/span')),
                    10000
                );
                await browserTab.click();
                console.log("Browser Tab Opened..");
                await sleep(4000);

                const add_cert = await driver.wait(
                    until.elementIsVisible(driver.findElement(By.xpath(
                        '/html/body/div/div/div/wat-qttr/div[1]/div[1]/div/div/div[5]/div/div/div/div/div[3]/div/div/div/div'))),
                    10000
                );
                await driver.wait(until.elementIsEnabled(add_cert), 10000);
                await add_cert.click();
                console.log("Add button clicked.");
                await sleep(4000);

                await driver.executeScript(`
                    const input = document.getElementById('certFileInput');
                    if (input && input.classList.contains('wat-hide')) {
                        input.classList.remove('wat-hide');
                    }
                `);

                const fileInput = await driver.findElement(By.id('certFileInput'));
                await driver.wait(until.elementIsVisible(fileInput), 10000);

                const certPath = path.resolve(__dirname, 'ca.pem');
                if (!fs.existsSync(certPath)) {
                    console.error("Certificate file does not exist:", certPath);
                    await driver.quit();
                    return;
                }

                await fileInput.sendKeys(certPath);
                console.log("Certificate uploaded successfully!");
                await sleep(2000);

                // Navigate to SSH code 
                await rebootViaSSH(ipAddress);
                console.log("Reboot triggered via SSH");

            } catch (error) {
                console.error(`Error for IP ${ipAddress}:`, error);
            } finally {
                await driver.quit();
            }
        }
    } catch (error) {
        console.error('Error reading IP addresses:', error);
    }
}

// Function Call
openUrlWithIP();
