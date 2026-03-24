const Imap = require("imap");
const { simpleParser } = require("mailparser");

// 🔥 SUBJECT PARSER
function parseNikeEmail(subject) {
  if (!subject) return null;

  const clean = subject.replace("[NikeMPX]", "").trim();

  const parts = clean.split("-");
  const left = parts[0]?.trim() || "";
  const environment = parts[1]?.trim() || "";

  let status = "";
  let process = "";

  if (left.toLowerCase().includes("started")) {
    status = "started";
    process = left.replace(/started/i, "").trim();
  } else if (left.toLowerCase().includes("completed")) {
    status = "completed";
    process = left.replace(/completed/i, "").trim();
  } else if (left.toLowerCase().includes("failed")) {
    status = "failed";
    process = left.replace(/failed/i, "").trim();
  } else {
    process = left;
  }

  return {
    project: "NikeMPX",
    process,
    status,
    environment,
  };
}

// 🔥 CLEAN BODY
function cleanBody(text) {
  if (!text) return "";

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 10)
    .join(" ");
}

// 🔥 MAIN FUNCTION
function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: "sanket.saurav@o9solutions.com",
      password: "iyxj bfvs xkke losm", // ⚠️ app password
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false, // ⚠️ dev only
      },
    });

    let emails = [];

    // 🔥 IMPORTANT: OPEN ZIMPLE LABEL
    function openZimple(cb) {
      imap.openBox("zimple", true, cb); // ✅ your label
      // If fails → try: "[Google Mail]/zimple"
    }

    imap.once("ready", function () {
      console.log("IMAP Connected ✅");

      openZimple(function (err, box) {
        if (err) {
          console.error("❌ Error opening zimple:", err);
          return reject(err);
        }

        const total = box.messages.total;

        if (!total || total < 1) {
          console.log("No emails in zimple 📭");
          imap.end();
          return resolve([]);
        }

        const start = Math.max(1, total - 2000);
        const range = `${start}:${total}`;

        console.log("📥 Fetching from ZIMPLE:", range);

        const fetch = imap.seq.fetch(range, {
          bodies: "",
        });

        fetch.on("message", function (msg) {
          msg.on("body", function (stream) {
            simpleParser(stream, (err, parsed) => {
              if (err) return;

              const sender =
                parsed.from?.value?.[0]?.address?.toLowerCase() || "";

              // 🔥 FILTER BY SENDER
              if (
                sender.includes("prodnike") ||
                sender.includes("preprodnike")
              ) {
                const parsedData = parseNikeEmail(parsed.subject);

                if (parsedData) {
                  emails.push({
                    ...parsedData,
                    subject: parsed.subject || "",
                    from: sender,
                    date: parsed.date || "",
                    body: cleanBody(parsed.text),
                  });
                }
              }
            });
          });
        });

        fetch.once("end", function () {
          console.log("Emails fetched count:", emails.length);

          // 🔥 Sort latest first
          emails.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );

          console.log("Fetched Emails 🔥:", emails);

          imap.end();
          resolve(emails);
        });
      });
    });

    imap.once("error", function (err) {
      console.error("IMAP Error ❌", err);
      reject(err);
    });

    imap.once("end", function () {
      console.log("IMAP connection closed 🔚");
    });

    imap.connect();
  });
}

module.exports = { fetchEmails };