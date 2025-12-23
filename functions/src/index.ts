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
    console.log("🚀 Starting LifeLenz Scraper Sync V2 (Serverless Mode)...");

    let browser = null;
    let extractedTeam: any[] = [];

    try {
      // 1. Configure Chromium for Cloud Functions
      // Removed 'ignoreHTTPSErrors' to satisfy strict TS check
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();

      // --- LOGIN SEQUENCE ---
      console.log("🔑 Navigating to Login...");
      await page.goto("https://admin.lifelenz.com/us01/auth/login", {
        waitUntil: "networkidle2",
      });

      console.log("✍️ Entering Credentials...");
      await page.type("#email", lifelenzEmail.value());
      await page.type("#password", lifelenzPassword.value());

      console.log("Cd Clicking Login...");
      await page.click('button[type="submit"]');

      await page.waitForNavigation({ waitUntil: "networkidle2" });
      console.log("✅ Login Successful.");

      // --- SETUP INTERCEPTOR ---
      page.on("response", async (response) => {
        const url = response.url();

        if (
          url.includes("manager/graphql") &&
          url.includes("GetSchedulableEmploymentsForPeriod")
        ) {
          console.log("📥 Intercepted Employee Data Stream.");
          try {
            const json = await response.json();
            if (
              json.data &&
              json.data.employmentsInScheduleTimeRange &&
              json.data.employmentsInScheduleTimeRange.edges
            ) {
              const rawEmployees = json.data.employmentsInScheduleTimeRange.edges;

              extractedTeam = rawEmployees
                .map((edge: any) => {
                  const node = edge.node;

                  const activeRate =
                    node.employmentRates.find((r: any) => r.status === "active") ||
                    node.employmentRates[0];

                  const jobTitle = activeRate?.jobTitle?.name || "Team Member";
                  const jobCode = activeRate?.jobTitle?.code || "";

                  let dept = "FOH";
                  const lowerTitle = jobTitle.toLowerCase();
                  if (
                    lowerTitle.includes("kitchen") ||
                    lowerTitle.includes("cook") ||
                    jobCode.includes("KD")
                  ) {
                    dept = "BOH";
                  }

                  let role = "Team Member";
                  let status = "Team Member";

                  if (jobTitle.includes("Director")) {
                    role = "Director";
                    status = "Director";
                  } else if (jobTitle.includes("Manager")) {
                    role = "Assistant Director";
                    status = "Assistant Director";
                  } else if (
                    jobTitle.includes("Leader") ||
                    jobTitle.includes("Shift")
                  ) {
                    role = "Team Leader";
                    status = "Team Leader";
                  }

                  if (
                    node.currentStatus &&
                    node.currentStatus.includes("terminated")
                  ) {
                    return null;
                  }

                  return {
                    id: node.userId || node.id,
                    name: node.computedName,
                    email: node.email || "",
                    role: role,
                    dept: dept,
                    status: status,
                    joined: node.duringFrom,
                    image:
                      node.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        node.computedName
                      )}&background=random`,
                    progress: 0,
                    stats: {
                      speed: 50,
                      accuracy: 50,
                      hospitality: 50,
                      knowledge: 50,
                      leadership: 50,
                    },
                  };
                })
                .filter((e: any) => e !== null);
            }
          } catch (err) {
            console.error("Error parsing JSON response", err);
          }
        }
      });

      // --- NAVIGATE TO SCHEDULE ---
      console.log("📅 Navigating to Schedule Page...");
      const targetUrl =
        "https://admin.lifelenz.com/us02/timekeeping/week/f3f058e6-5679-40a7-aed1-6b192897d683/1583007f-55ff-4e69-abc2-b4a053a728ca/";

      await page.goto(targetUrl, { waitUntil: "networkidle2" });

      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error("❌ Scraper Error:", error);
    } finally {
      if (browser) await browser.close();
    }

    // --- SYNC TO FIRESTORE ---
    if (extractedTeam.length > 0) {
      console.log(`📦 Syncing ${extractedTeam.length} members to Firestore...`);

      const batch = db.batch();
      let count = 0;

      for (const member of extractedTeam) {
        if (!member.email) continue;

        const docRef = db.collection("teamMembers").doc(member.id);

        batch.set(
          docRef,
          {
            ...member,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        count++;
        if (count >= 400) {
          await batch.commit();
          count = 0;
        }
      }

      if (count > 0) await batch.commit();
      console.log("🎉 Sync Complete.");
    } else {
      console.log("⚠️ No data extracted. Check login or API path.");
    }
  }
);