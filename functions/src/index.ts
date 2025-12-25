import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

admin.initializeApp();
const db = admin.firestore();

const lifelenzEmail = defineSecret("LIFELENZ_EMAIL");
const lifelenzPassword = defineSecret("LIFELENZ_PASSWORD");

export const syncTeamRoster = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "America/New_York",
    timeoutSeconds: 300, 
    memory: "2GiB",      
    secrets: [lifelenzEmail, lifelenzPassword],
  },
  async (event) => {
    console.log("🚀 Starting LifeLenz Scraper V7 (Unassigned Default)...");

    let browser = null;
    let scrapedData: any[] = [];

    try {
      console.log("1. Configuring Chromium...");
      chromium.setGraphicsMode = false;
      
      console.log("2. Launching Browser...");
      browser = await puppeteer.launch({
        args: [
            ...chromium.args,
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--no-zygote"
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        executablePath: await chromium.executablePath(),
        headless: true, 
      });

      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');

      console.log("4. Navigating to Login Page...");
      await page.goto("https://admin.lifelenz.com/us01/auth/login", { 
          waitUntil: "networkidle2",
          timeout: 60000 
      });

      console.log("5. Waiting for Email Input...");
      await page.waitForSelector('#email', { timeout: 10000 });

      console.log("6. Typing Credentials...");
      await page.type("#email", lifelenzEmail.value());
      await page.type("#password", lifelenzPassword.value());

      console.log("7. Clicking Submit...");
      await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
          page.click('button[type="submit"]'),
      ]);
      
      console.log("8. Login Successful.");

      // --- LISTENER SETUP ---
      page.on("response", async (response) => {
        const url = response.url();
        
        if (url.includes("manager/graphql")) {
            try {
                const json = await response.json();
                
                if (json.data?.employmentsInScheduleTimeRange?.edges) {
                    console.log("🎯 TARGET DATA STREAM DETECTED!");
                    
                    const newRows = json.data.employmentsInScheduleTimeRange.edges
                        .map((edge: any) => {
                            const node = edge.node;
                            
                            if (node.currentStatus && node.currentStatus.toLowerCase().includes("terminated")) {
                                return null;
                            }

                            return {
                                id: node.userId || node.id,
                                name: node.computedName,
                                email: node.email || "",
                                // Default values for NEW users only
                                role: "Team Member",
                                status: "Onboarding", 
                                // UPDATED: Default to "Unassigned" so you can set it manually in the app
                                dept: "Unassigned", 
                                joined: node.duringFrom,
                                image: node.image || "",
                                stats: { speed: 50, accuracy: 50, hospitality: 50, knowledge: 50, leadership: 50 },
                                progress: 0
                            };
                        })
                        .filter((e: any) => e !== null);
                        
                    scrapedData = [...scrapedData, ...newRows];
                }
            } catch (err) {
                // Ignore JSON parse errors
            }
        }
      });

      console.log("9. Navigating to Specific Schedule View...");
      const targetUrl = "https://admin.lifelenz.com/us02/schedule/week/f3f058e6-5679-40a7-aed1-6b192897d683/1583007f-55ff-4e69-abc2-b4a053a728ca";
      
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });
      
      console.log("10. Waiting for Data Stream (15 seconds)...");
      await new Promise((resolve) => setTimeout(resolve, 15000));

    } catch (error) {
      console.error("❌ CRITICAL SCRAPER ERROR:", error);
    } finally {
      if (browser) await browser.close();
    }

    // --- SYNC ---
    if (scrapedData.length > 0) {
      console.log(`📦 Processing ${scrapedData.length} users for Firestore...`);
      
      const snapshot = await db.collection("teamMembers").get();
      const existingIds = new Set(snapshot.docs.map(doc => doc.id));

      const batch = db.batch();
      let count = 0;

      for (const member of scrapedData) {
        if (!member.email) continue;
        const docRef = db.collection("teamMembers").doc(member.id);

        if (existingIds.has(member.id)) {
            // EXISTING USER:
            // Only update immutable profile data (Name, Email, Join Date)
            // WE DO NOT UPDATE 'dept', 'role', or 'status' so your manual changes stick.
            batch.set(docRef, {
                name: member.name,
                email: member.email,
                joined: member.joined,
                ...(member.image ? { image: member.image } : {}),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else {
            // NEW USER: Create with default "Unassigned"
            console.log(`✨ New Hire Detected: ${member.name}`);
            batch.set(docRef, {
                ...member,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        count++;
        if (count >= 400) { await batch.commit(); count = 0; }
      }
      
      if (count > 0) await batch.commit();
      console.log("✅ Sync Complete.");
    }
  }
);